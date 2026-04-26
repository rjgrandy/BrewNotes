import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { DEFAULT_RATINGS, DEFAULT_SETTINGS, DRINK_TYPES } from '../utils/constants';
import { formatVolume, ozToMl } from '../utils/units';
import { addRecentName, getDefaultName, getRecentNames } from '../utils/attribution';
import SegmentedControl from '../components/SegmentedControl';
import StarRating from '../components/StarRating';

const defaultDrink = {
  custom_label: '',
  notes: '',
  ...DEFAULT_SETTINGS,
  ...DEFAULT_RATINGS
};

type Props = { unit: string };

export default function Dashboard({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beanId, setBeanId] = useState('');
  const [drinkType, setDrinkType] = useState(DRINK_TYPES[0]);
  const [form, setForm] = useState(defaultDrink);
  const [coffeeVolumeInput, setCoffeeVolumeInput] = useState('');
  const [milkVolumeInput, setMilkVolumeInput] = useState('');
  const [madeBy, setMadeBy] = useState(getDefaultName());
  const [message, setMessage] = useState('');
  const [selectedDrink, setSelectedDrink] = useState<DrinkLog | null>(null);
  const recentNames = useMemo(() => getRecentNames(), []);
  const beanById = useMemo(() => new Map(beans.map((bean) => [bean.id, bean])), [beans]);
  const levelLabel: { strength: Record<string, string>; body: Record<string, string> } = {
    strength: {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'Strong'
    },
    body: {
      LIGHT: 'Low',
      MEDIUM: 'Medium',
      BOLD: 'Strong'
    }
  } as const;

  const getBeanLabel = (bean: Bean) => {
    if (bean.roaster) {
      return `${bean.roaster} — ${bean.name}`;
    }
    return bean.name;
  };


  useEffect(() => {
    const load = async () => {
      const beansRes = await apiGet<Bean[]>('/api/beans');
      const drinksRes = await apiGet<DrinkLog[]>('/api/drinks');
      setBeans(beansRes);
      setDrinks(drinksRes);
      if (beansRes[0]) {
        setBeanId(beansRes[0].id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const formatVolumeInput = (volumeMl: number) =>
      unit === 'oz' ? (volumeMl / 29.5735).toFixed(1) : String(volumeMl);
    setCoffeeVolumeInput(formatVolumeInput(form.coffee_volume_ml));
    setMilkVolumeInput(formatVolumeInput(form.milk_volume_ml));
  }, [form.coffee_volume_ml, form.milk_volume_ml, unit]);

  const lastDrink = useMemo(() => {
    return drinks.find((drink) => drink.bean_id === beanId && drink.drink_type === drinkType);
  }, [drinks, beanId, drinkType]);

  const applySettings = (settings: Partial<typeof defaultDrink>) => {
    setForm((prev) => ({
      ...prev,
      ...settings
    }));
  };

  const extractSettings = (drink: DrinkLog) => ({
    temperature_level: drink.temperature_level,
    body_level: drink.body_level,
    order: drink.order,
    coffee_volume_ml: drink.coffee_volume_ml,
    milk_volume_ml: drink.milk_volume_ml,
    strength_level: drink.strength_level,
    grind_setting: drink.grind_setting
  });

  const handleSubmit = async () => {
    if (!beanId) return;
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
    setMessage('Saved!');
    setTimeout(() => setMessage(''), 2000);
  };

  const updateVolume = (field: 'coffee_volume_ml' | 'milk_volume_ml', value: string) => {
    if (field === 'coffee_volume_ml') {
      setCoffeeVolumeInput(value);
    } else {
      setMilkVolumeInput(value);
    }

    if (value.trim() === '') {
      return;
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: unit === 'oz' ? ozToMl(num) : num
    }));
  };

  const normalizeVolumeOnBlur = (field: 'coffee_volume_ml' | 'milk_volume_ml') => {
    const value = field === 'coffee_volume_ml' ? coffeeVolumeInput : milkVolumeInput;
    if (value.trim() !== '') {
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: 0
    }));
  };

  useEffect(() => {
    if (lastDrink) {
      applySettings(extractSettings(lastDrink));
    }
  }, [lastDrink]);

  return (
    <div className="grid two">
      <section className="card stack">
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Fast Drink Entry</h3>
          <span className="badge">KF7 ready</span>
        </div>
        <label className="stack">
          <span className="label">Bean</span>
          <select value={beanId} onChange={(event) => setBeanId(event.target.value)}>
            {beans.map((bean) => (
              <option key={bean.id} value={bean.id}>
                {getBeanLabel(bean)}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          <span className="label">Drink Type</span>
          <div className="chip-row" role="tablist" aria-label="Drink Type">
            {DRINK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={drinkType === type}
                className={drinkType === type ? 'chip active' : 'chip'}
                onClick={() => setDrinkType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </label>
        <div className="label">Last drink settings are copied automatically.</div>
        <div className="grid two">
          <div className="stack">
            <span className="label">Strength</span>
            <SegmentedControl
              value={form.strength_level}
              ariaLabel="Strength level"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' }
              ]}
              onChange={(value) => setForm({ ...form, strength_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Temperature</span>
            <SegmentedControl
              value={form.temperature_level}
              ariaLabel="Temperature level"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' }
              ]}
              onChange={(value) => setForm({ ...form, temperature_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Body</span>
            <SegmentedControl
              value={form.body_level}
              ariaLabel="Body level"
              options={[
                { value: 'LIGHT', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'BOLD', label: 'Strong' }
              ]}
              onChange={(value) => setForm({ ...form, body_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Order</span>
            <SegmentedControl
              value={form.order}
              ariaLabel="Pour order"
              options={[
                { value: 'COFFEE_FIRST', label: 'Coffee First' },
                { value: 'MILK_FIRST', label: 'Milk First' }
              ]}
              onChange={(value) => setForm({ ...form, order: value })}
            />
          </div>
          <label className="stack">
            <span className="label">Coffee Volume ({unit})</span>
            <input
              type="number"
              min="0"
              step={unit === 'oz' ? '0.1' : '2.957'}
              value={coffeeVolumeInput}
              onChange={(event) => updateVolume('coffee_volume_ml', event.target.value)}
              onBlur={() => normalizeVolumeOnBlur('coffee_volume_ml')}
            />
          </label>
          <label className="stack">
            <span className="label">Milk Volume ({unit})</span>
            <input
              type="number"
              min="0"
              step={unit === 'oz' ? '0.1' : '2.957'}
              value={milkVolumeInput}
              onChange={(event) => updateVolume('milk_volume_ml', event.target.value)}
              onBlur={() => normalizeVolumeOnBlur('milk_volume_ml')}
            />
          </label>
          <label className="stack">
            <span className="label">Grind (1-7)</span>
            <div className="range-field">
              <input
                type="range"
                min="1"
                max="7"
                value={form.grind_setting}
                onChange={(event) => setForm({ ...form, grind_setting: Number(event.target.value) })}
              />
              <span className="range-value">{form.grind_setting}</span>
            </div>
          </label>
        </div>
        <div className="grid two">
          <label className="stack">
            <span className="label">Overall Rating</span>
            <StarRating label="Overall Rating" value={form.overall_rating} onChange={(value) => setForm({ ...form, overall_rating: value })} />
          </label>
          <label className="stack">
            <span className="label balance-label">
              <span>Sour</span>
              <span>Balanced</span>
              <span>Bitter</span>
            </span>
            <SegmentedControl
              value={String(form.balance)}
              ariaLabel="Sour to bitter balance"
              className="balance-scale"
              hideLabels
              options={[
                { value: '1', label: 'Sour', ariaLabel: 'Sour' },
                { value: '2', label: 'Leans Sour', ariaLabel: 'Leans Sour' },
                { value: '3', label: 'Balanced', ariaLabel: 'Balanced' },
                { value: '4', label: 'Leans Bitter', ariaLabel: 'Leans Bitter' },
                { value: '5', label: 'Bitter', ariaLabel: 'Bitter' }
              ]}
              onChange={(value) => setForm({ ...form, balance: Number(value) })}
            />
          </label>
        </div>
        <div className="grid two">
          <label className="stack">
            <span className="label">Made By</span>
            <input list="names" value={madeBy} onChange={(event) => setMadeBy(event.target.value)} />
          </label>
          <datalist id="names">
            {recentNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <label className="stack">
            <span className="label">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <button className="primary" onClick={handleSubmit}>
          Save Drink
        </button>
        {message && <span className="label">{message}</span>}
      </section>
      <section className="stack">
        <div className="card">
          <h3>Recent Drinks</h3>
          <div className="stack">
            {drinks.slice(0, 5).map((drink) => (
              <button key={drink.id} type="button" className="recent-drink-item" onClick={() => setSelectedDrink(drink)}>
                <div>
                  <div>
                    {beanById.get(drink.bean_id) ? getBeanLabel(beanById.get(drink.bean_id) as Bean) : 'Unknown bean'}
                  </div>
                  <div>{drink.drink_type}</div>
                  <div className="label">
                    {formatVolume(drink.coffee_volume_ml, unit)} · Strength {levelLabel.strength[drink.strength_level]}
                  </div>
                </div>
                <span className="badge">{drink.overall_rating}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Hall of Fame (30 days)</h3>
          <div className="stack">
            {drinks
              .filter((drink) => drink.overall_rating >= 4)
              .slice(0, 5)
              .map((drink) => (
                <div key={drink.id} className="inline" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div>{drink.drink_type}</div>
                    <div className="label">{drink.notes || 'No notes'}</div>
                  </div>
                  <span className="badge">{drink.overall_rating}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {selectedDrink && (
        <div className="modal-overlay" role="presentation" onClick={() => setSelectedDrink(null)}>
          <div className="card stack modal-card" role="dialog" aria-modal="true" aria-label="Drink details" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 4 }}>{selectedDrink.drink_type}</h3>
                <div className="label">{beanById.get(selectedDrink.bean_id) ? getBeanLabel(beanById.get(selectedDrink.bean_id) as Bean) : 'Unknown bean'}</div>
              </div>
              <button type="button" onClick={() => setSelectedDrink(null)}>
                Close
              </button>
            </div>
            <div className="details-grid">
              <div>
                <div className="label">Coffee volume</div>
                <div className="detail-value">{formatVolume(selectedDrink.coffee_volume_ml, unit)}</div>
              </div>
              <div>
                <div className="label">Milk volume</div>
                <div className="detail-value">{formatVolume(selectedDrink.milk_volume_ml, unit)}</div>
              </div>
              <div>
                <div className="label">Strength</div>
                <div className="detail-value">{levelLabel.strength[selectedDrink.strength_level]}</div>
              </div>
              <div>
                <div className="label">Temperature</div>
                <div className="detail-value">{selectedDrink.temperature_level}</div>
              </div>
              <div>
                <div className="label">Body</div>
                <div className="detail-value">{levelLabel.body[selectedDrink.body_level]}</div>
              </div>
              <div>
                <div className="label">Order</div>
                <div className="detail-value">{selectedDrink.order.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="label">Grind</div>
                <div className="detail-value">{selectedDrink.grind_setting}</div>
              </div>
              <div>
                <div className="label">Rating</div>
                <div className="detail-value">{selectedDrink.overall_rating}/5</div>
              </div>
            </div>
            <div>
              <div className="label">Notes</div>
              <div>{selectedDrink.notes || 'No notes yet.'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
