import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Trophy, BookmarkPlus } from 'lucide-react';
import { apiGet, apiSend } from '../utils/api';
import { upsertRecipe, recipeForType } from '../utils/beanApi';
import { Bean, DrinkLog, RecipeSettings } from '../utils/types';
import { DEFAULT_RATINGS, DEFAULT_SETTINGS, DRINK_TYPES } from '../utils/constants';
import { formatVolume } from '../utils/units';
import { addRecentName, getDefaultName, getRecentNames } from '../utils/attribution';
import ChipSelect from '../components/ChipSelect';
import RecipeControls from '../components/RecipeControls';
import RatingPanel from '../components/RatingPanel';
import Hero from '../components/Hero';
import { useToast } from '../components/ui/Toast';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../components/ui/Dialog';

const defaultDrink = {
  custom_label: '',
  notes: '',
  ...DEFAULT_SETTINGS,
  ...DEFAULT_RATINGS
};

const SETTING_KEYS: (keyof RecipeSettings)[] = [
  'temperature_level',
  'body_level',
  'order',
  'coffee_volume_ml',
  'milk_volume_ml',
  'strength_level',
  'grind_setting'
];

const extractSettings = (source: DrinkLog | RecipeSettings): RecipeSettings => {
  const out: RecipeSettings = {};
  for (const key of SETTING_KEYS) {
    const val = (source as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) (out as Record<string, unknown>)[key] = val;
  }
  return out;
};

const STRENGTH_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'Strong' };
const BODY_LABEL: Record<string, string> = { LIGHT: 'Light', MEDIUM: 'Medium', BOLD: 'Bold' };

type Props = { unit: string };

export default function Dashboard({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beanId, setBeanId] = useState('');
  const [drinkType, setDrinkType] = useState(DRINK_TYPES[0]);
  const [form, setForm] = useState(defaultDrink);
  const [madeBy, setMadeBy] = useState(getDefaultName());
  const [selectedDrink, setSelectedDrink] = useState<DrinkLog | null>(null);
  const recentNames = useMemo(() => getRecentNames(), []);
  const toast = useToast();

  const beanById = useMemo(() => new Map(beans.map((bean) => [bean.id, bean])), [beans]);
  const bean = beanById.get(beanId);

  const getBeanLabel = (b: Bean) => (b.roaster ? `${b.roaster} — ${b.name}` : b.name);

  useEffect(() => {
    const load = async () => {
      const [beansRes, drinksRes] = await Promise.all([
        apiGet<Bean[]>('/api/beans'),
        apiGet<DrinkLog[]>('/api/drinks')
      ]);
      setBeans(beansRes);
      setDrinks(drinksRes);
      if (beansRes[0]) setBeanId(beansRes[0].id);
    };
    load();
  }, []);

  // Prefill settings when the bean or drink type changes: saved recipe first,
  // then the last matching drink, then defaults. Ratings reset for a fresh log.
  useEffect(() => {
    if (!beanId) return;
    const recipe = recipeForType(beanById.get(beanId), drinkType);
    const lastDrink = drinks.find((d) => d.bean_id === beanId && d.drink_type === drinkType);
    const base = recipe ?? (lastDrink ? extractSettings(lastDrink) : DEFAULT_SETTINGS);
    setForm({ ...defaultDrink, ...base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beanId, drinkType]);

  const currentSettings = (): RecipeSettings => extractSettings(form as unknown as RecipeSettings);
  const hasRecipe = !!recipeForType(bean, drinkType);

  const handleSubmit = async () => {
    if (!beanId) {
      toast('Add a bean first', 'error');
      return;
    }
    const payload = {
      bean_id: beanId,
      drink_type: drinkType,
      custom_label: form.custom_label,
      made_by: madeBy,
      rated_by: madeBy,
      temperature_level: form.temperature_level,
      body_level: form.body_level,
      order: form.order,
      coffee_volume_ml: form.coffee_volume_ml,
      milk_volume_ml: form.milk_volume_ml,
      strength_level: form.strength_level,
      grind_setting: form.grind_setting,
      overall_rating: form.overall_rating,
      sweetness: form.sweetness,
      bitterness: form.bitterness,
      acidity: form.acidity,
      body_mouthfeel: form.body_mouthfeel,
      balance: form.balance,
      would_make_again: form.would_make_again,
      dialed_in: form.dialed_in,
      notes: form.notes
    };
    const created = await apiSend<DrinkLog>('/api/drinks', 'POST', payload);
    setDrinks((prev) => [created, ...prev]);
    addRecentName(madeBy);
    toast('Drink logged', 'success');
  };

  const handleSaveRecipe = async () => {
    if (!beanId) return;
    const recipe = await upsertRecipe(beanId, drinkType, currentSettings());
    setBeans((prev) =>
      prev.map((b) =>
        b.id === beanId
          ? { ...b, recipes: [...(b.recipes ?? []).filter((r) => r.drink_type !== drinkType), recipe] }
          : b
      )
    );
    toast(`Saved best ${drinkType} recipe`, 'success');
  };

  const topDrinks = drinks.filter((d) => d.overall_rating >= 4).slice(0, 5);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const avgRating = drinks.length
    ? (drinks.reduce((sum, d) => sum + d.overall_rating, 0) / drinks.length).toFixed(1)
    : '–';

  return (
    <div className="flex flex-col gap-5">
      <Hero
        kicker="Crafted coffee journal"
        title={`${greeting}, time to brew`}
        subtitle="Pick a bean and dial type — your saved recipe loads automatically."
        stats={[
          { label: 'Beans', value: String(beans.length) },
          { label: 'Drinks', value: String(drinks.length) },
          { label: 'Avg rating', value: avgRating }
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card flex flex-col gap-5 p-5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Bean</span>
              <select className="input" value={beanId} onChange={(e) => setBeanId(e.target.value)}>
                {beans.length === 0 && <option value="">No beans yet</option>}
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {getBeanLabel(b)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Made by</span>
              <input className="input" list="names" value={madeBy} onChange={(e) => setMadeBy(e.target.value)} />
              <datalist id="names">
                {recentNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="field-label">Drink type</span>
            <ChipSelect ariaLabel="Drink type" options={DRINK_TYPES} value={drinkType} onChange={setDrinkType} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="section-title">Recipe</span>
              <span className="text-xs text-muted">
                {hasRecipe ? 'Loaded from saved recipe' : 'Using last brew / defaults'}
              </span>
            </div>
            <RecipeControls value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} unit={unit} />
            <button type="button" className="btn self-start" onClick={handleSaveRecipe} disabled={!beanId}>
              <BookmarkPlus size={17} />
              Save as best {drinkType} recipe
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <span className="section-title">Rating</span>
            <RatingPanel value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Notes</span>
            <textarea
              className="input"
              placeholder="Tasting notes, tweaks for next time…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <button className="btn btn-primary" onClick={handleSubmit}>
            <Sparkles size={18} />
            Log drink
          </button>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="card p-5">
            <h3 className="section-title mb-3">Recent drinks</h3>
            <div className="flex flex-col gap-2">
              {drinks.length === 0 && <p className="text-sm text-muted">No drinks logged yet.</p>}
              {drinks.slice(0, 5).map((drink) => (
                <button
                  key={drink.id}
                  type="button"
                  className="card-muted flex items-start justify-between gap-3 p-3 text-left transition-transform hover:-translate-y-0.5"
                  onClick={() => setSelectedDrink(drink)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{drink.drink_type}</div>
                    <div className="truncate text-xs text-muted">
                      {beanById.get(drink.bean_id) ? getBeanLabel(beanById.get(drink.bean_id) as Bean) : 'Unknown bean'}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {formatVolume(drink.coffee_volume_ml, unit)} · {STRENGTH_LABEL[drink.strength_level]} · G{drink.grind_setting}
                    </div>
                  </div>
                  <span className="badge badge-gold">★ {drink.overall_rating}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-gold" /> Hall of fame
            </h3>
            <div className="flex flex-col gap-2">
              {topDrinks.length === 0 && <p className="text-sm text-muted">Rate a drink 4★+ to see it here.</p>}
              {topDrinks.map((drink) => (
                <div key={drink.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{drink.drink_type}</div>
                    <div className="truncate text-xs text-muted">{drink.notes || 'No notes'}</div>
                  </div>
                  <span className="badge badge-gold">★ {drink.overall_rating}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={!!selectedDrink} onOpenChange={(open) => !open && setSelectedDrink(null)}>
        {selectedDrink && (
          <DialogContent>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold">{selectedDrink.drink_type}</DialogTitle>
                <div className="text-sm text-muted">
                  {beanById.get(selectedDrink.bean_id)
                    ? getBeanLabel(beanById.get(selectedDrink.bean_id) as Bean)
                    : 'Unknown bean'}
                </div>
              </div>
              <DialogClose asChild>
                <button className="btn btn-ghost !min-h-0 px-3 py-1.5">Close</button>
              </DialogClose>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Coffee', formatVolume(selectedDrink.coffee_volume_ml, unit)],
                ['Milk', formatVolume(selectedDrink.milk_volume_ml, unit)],
                ['Strength', STRENGTH_LABEL[selectedDrink.strength_level]],
                ['Temperature', selectedDrink.temperature_level],
                ['Body', BODY_LABEL[selectedDrink.body_level]],
                ['Order', selectedDrink.order.replace('_', ' ')],
                ['Grind', String(selectedDrink.grind_setting)],
                ['Rating', `${selectedDrink.overall_rating}/5`]
              ].map(([label, val]) => (
                <div key={label} className="card-muted px-3 py-2">
                  <div className="field-label">{label}</div>
                  <div className="font-semibold">{val}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="field-label">Notes</div>
              <p className="text-sm">{selectedDrink.notes || 'No notes yet.'}</p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
