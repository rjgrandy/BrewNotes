import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, BookmarkPlus, Check, Coffee, Sparkles, Trophy } from 'lucide-react';
import { apiSend, uploadFile } from '../utils/api';
import { upsertRecipe, recipeForType } from '../utils/beanApi';
import { Bean, DrinkLog, RecipeSettings } from '../utils/types';
import { DEFAULT_RATINGS, DEFAULT_SETTINGS, DRINK_TYPES } from '../utils/constants';
import { addRecentName, getDefaultName, getRecentNames } from '../utils/attribution';
import { useAction, useResource } from '../utils/useResource';
import { beanLabel } from '../utils/history';
import ChipSelect from '../components/ChipSelect';
import RecipeControls from '../components/RecipeControls';
import RatingPanel from '../components/RatingPanel';
import DrinkCard from '../components/DrinkCard';
import PhotoPicker from '../components/PhotoPicker';
import LoadState from '../components/LoadState';
import { useToast } from '../components/ui/Toast';

const extractSettings = (source: RecipeSettings): RecipeSettings => ({
  temperature_level: source.temperature_level, body_level: source.body_level, order: source.order,
  coffee_volume_ml: source.coffee_volume_ml, milk_volume_ml: source.milk_volume_ml,
  strength_level: source.strength_level, grind_setting: source.grind_setting
});
const freshForm = (settings: RecipeSettings) => ({ ...DEFAULT_SETTINGS, ...settings, ...DEFAULT_RATINGS, notes: '', custom_label: '' });

export default function Dashboard({ unit }: { unit: string }) {
  const coffees = useResource<Bean[]>('/api/beans?include_archived=true');
  const logs = useResource<DrinkLog[]>('/api/drinks');
  const [params] = useSearchParams();
  return <div className="flex flex-col gap-6">
    <section className="journal-hero"><p className="eyebrow">Your daily coffee ritual</p><h1 className="hero-title">Make a little time<br />for a <em>better cup.</em></h1><p className="mt-3 max-w-lg text-sm text-muted">Keep what worked. Tweak what didn’t. Your favorite coffee is a few notes away.</p><Coffee className="hero-coffee" aria-hidden="true" /></section>
    <LoadState loading={coffees.loading || logs.loading} error={coffees.error} retry={coffees.retry} />
    <LoadState error={logs.error} retry={logs.retry} />
    {coffees.data && !logs.loading && (coffees.data.length ? <BrewForm key={params.toString()} initialBeans={coffees.data} initialDrinks={logs.data ?? []} requestedBean={params.get('bean')} requestedType={params.get('type')} repeatId={params.get('repeat')} unit={unit} /> : <div className="card empty-state"><h2>First, meet your beans.</h2><p>Add the coffee you’re brewing with. We’ll keep its photos, recipes, and every cup together.</p><Link className="btn btn-primary" to="/beans?add=true">Add your first bean</Link></div>)}
  </div>;
}

function BrewForm({ initialBeans, initialDrinks, requestedBean, requestedType, repeatId, unit }: { initialBeans: Bean[]; initialDrinks: DrinkLog[]; requestedBean: string | null; requestedType: string | null; repeatId: string | null; unit: string }) {
  const repeat = initialDrinks.find(d => d.id === repeatId);
  const initialBean = initialBeans.find(b => b.id === (repeat?.bean_id || requestedBean)) || initialBeans.find(b => !b.archived);
  const initialType = repeat?.drink_type || (DRINK_TYPES.includes(requestedType || '') ? requestedType! : DRINK_TYPES[0]);
  const [beans, setBeans] = useState(initialBeans);
  const [drinks, setDrinks] = useState(initialDrinks);
  const [beanId, setBeanId] = useState(initialBean?.id || '');
  const [drinkType, setDrinkType] = useState(initialType);
  const settingsFor = (id: string, type: string): RecipeSettings => recipeForType(beans.find(b => b.id === id), type)
    ?? extractSettings(drinks.find(d => d.bean_id === id && d.drink_type === type) ?? DEFAULT_SETTINGS);
  const [form, setForm] = useState(() => freshForm(repeat ? extractSettings(repeat) : settingsFor(initialBean?.id || '', initialType)));
  const [madeBy, setMadeBy] = useState(getDefaultName());
  const [created, setCreated] = useState<DrinkLog>();
  const [usingRepeat, setUsingRepeat] = useState(!!repeat);
  const { busy, run } = useAction();
  const toast = useToast();
  const bean = beans.find(b => b.id === beanId);
  const activeBeans = beans.filter(b => !b.archived || b.id === beanId);
  const choose = (id: string, type: string) => { setBeanId(id); setDrinkType(type); setForm(freshForm(settingsFor(id, type))); setUsingRepeat(false); setCreated(undefined); };
  const save = () => run(async () => {
    if (!beanId) throw new Error('Choose a bean first.');
    const saved = await apiSend<DrinkLog>('/api/drinks', 'POST', { ...form, bean_id: beanId, drink_type: drinkType, made_by: madeBy, rated_by: madeBy });
    setDrinks(prev => [saved, ...prev]); setCreated(saved); addRecentName(madeBy);
    setForm(freshForm(extractSettings(form))); setUsingRepeat(false);
    toast('A good cup, remembered. Drink logged.', 'success');
  });
  const saveRecipe = () => run(async () => {
    const recipe = await upsertRecipe(beanId, drinkType, extractSettings(form));
    setBeans(prev => prev.map(b => b.id === beanId ? { ...b, recipes: [...(b.recipes ?? []).filter(r => r.drink_type !== drinkType), recipe] } : b));
    toast(`${drinkType} recipe saved for ${bean?.name}`, 'success');
  });
  const best = [...drinks].filter(d => d.overall_rating >= 4).sort((a, b) => b.overall_rating - a.overall_rating || b.created_at.localeCompare(a.created_at)).slice(0, 2);
  return <>
    {repeatId && !repeat && <p role="alert" className="card p-4 text-sm">That brew couldn’t be found. Choose your bean and recipe below.</p>}
    {created && <section className="card success-panel p-5" role="status"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><Check size={18} /> {created.drink_type} logged</h2><p className="mt-1 text-sm text-muted">Add a photo, or open the brew to review your notes.</p></div><Link className="btn" to={`/drinks/${created.id}`}>View saved brew <ArrowUpRight size={16} /></Link></div><div className="mt-3"><PhotoPicker onSave={async file => { const updated = await uploadFile<DrinkLog>(`/api/drinks/${created.id}/photo`, file); setCreated(updated); setDrinks(prev => prev.map(d => d.id === updated.id ? updated : d)); toast('Photo saved', 'success'); }} /></div></section>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="card flex flex-col gap-6 p-5 sm:p-6">
        <div><p className="eyebrow">Let’s brew</p><h2 className="text-2xl font-bold">What’s in your cup?</h2></div>
        {!activeBeans.length && <p className="text-sm text-muted">All your beans are archived. <Link to="/beans" className="text-accent underline">Unarchive a bean</Link> or add a new coffee to start brewing.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5"><span className="field-label">Coffee bean</span><select className="input" value={beanId} onChange={e => choose(e.target.value, drinkType)}>{!beanId && <option value="">Choose a bean</option>}{activeBeans.map(b => <option key={b.id} value={b.id}>{beanLabel(b)}{b.archived ? ' (archived)' : ''}</option>)}</select></label><label className="flex flex-col gap-1.5"><span className="field-label">Made by</span><input className="input" list="recent-makers" placeholder="Your name" value={madeBy} onChange={e => setMadeBy(e.target.value)} /><datalist id="recent-makers">{getRecentNames().map(name => <option key={name}>{name}</option>)}</datalist></label></div>
        {bean && <Link className="-mt-3 text-xs font-semibold text-accent" to={`/beans/${bean.id}`}>View {bean.name}’s brews & recipes →</Link>}
        <div className="flex flex-col gap-2"><span className="field-label">Drink type</span><ChipSelect ariaLabel="Drink type" options={DRINK_TYPES} value={drinkType} onChange={type => choose(beanId, type)} /></div>
        <div className="flex flex-col gap-4 border-t border-border pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="section-title">01 / Your recipe</h3><span className="badge">{usingRepeat ? 'Copied from your brew' : recipeForType(bean, drinkType) ? 'Saved bean recipe' : drinks.some(d => d.bean_id === beanId && d.drink_type === drinkType) ? 'Last brew settings' : 'Starting settings'}</span></div><RecipeControls value={form} onChange={patch => setForm(f => ({ ...f, ...patch }))} unit={unit} /><button className="btn self-start text-xs" disabled={!beanId || busy} onClick={saveRecipe}><BookmarkPlus size={16} /> Save as bean recipe</button></div>
        <div className="flex flex-col gap-4 border-t border-border pt-5"><h3 className="section-title">02 / How did it taste?</h3><RatingPanel value={form} onChange={patch => setForm(f => ({ ...f, ...patch }))} /><label className="flex flex-col gap-1.5"><span className="field-label">Tasting notes</span><textarea className="input" placeholder="Chocolate finish? A little too bitter? What would you try next?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label></div>
        <button className="btn btn-primary w-full" disabled={!beanId || busy} onClick={save}><Sparkles size={18} />{busy ? 'Saving…' : 'Log this cup'}</button>
      </section>
      <aside className="flex min-w-0 flex-col gap-6"><section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Fresh from your journal</h2><Link className="text-xs font-semibold text-accent" to="/drinks?view=history">View all →</Link></div><div className="flex flex-col gap-3">{drinks.slice(0, 3).map(d => <DrinkCard key={d.id} drink={d} bean={beans.find(b => b.id === d.bean_id)} unit={unit} />)}{!drinks.length && <div className="card empty-state"><Coffee size={28} className="mx-auto text-accent" /><h3>Your first cup belongs here.</h3><p>Log a drink and watch your coffee story grow.</p></div>}</div></section>
        <section className="card p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><Trophy size={18} className="text-gold" /> Worth another cup</h2>{best.length ? best.map(d => <Link key={d.id} to={`/?repeat=${d.id}`} className="flex items-center justify-between gap-3 border-t border-border py-3"><div><p className="text-sm font-semibold">{d.drink_type}</p><p className="text-xs text-muted">{beans.find(b => b.id === d.bean_id)?.name}</p></div><span className="rating-badge">★ {d.overall_rating}</span></Link>) : <p className="text-sm text-muted">Your highest rated brews will appear here, ready to make again.</p>}</section>
      </aside>
    </div>
  </>;
}
