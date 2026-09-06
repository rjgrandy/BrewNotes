import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, Star } from 'lucide-react';
import { Bean, DrinkLog } from '../utils/types';
import { useResource } from '../utils/useResource';
import { averageRating } from '../utils/history';
import DrinkGlyph from '../components/DrinkGlyph';
import DrinkHistory from '../components/DrinkHistory';
import LoadState from '../components/LoadState';

export default function Drinks({ unit }: { unit: string }) {
  const logs = useResource<DrinkLog[]>('/api/drinks');
  const coffees = useResource<Bean[]>('/api/beans?include_archived=true');
  const [params, setParams] = useSearchParams();
  const history = params.get('view') === 'history';
  const drinks = logs.data ?? [];
  const types = [...new Set(drinks.map(d => d.drink_type))].sort();
  return <div className="flex flex-col gap-6">
    <div className="page-heading"><div><p className="eyebrow">Your brewing journal</p><h1>Good cups, worth remembering.</h1><p>Explore a drink, compare its beans, and find your next favorite.</p></div><Link className="btn btn-primary" to="/"><Plus size={17} /> Log a drink</Link></div>
    <div className="segmented max-w-sm" aria-label="Drinks view">{['Drink types', 'All brews'].map((label, index) => <button key={label} className="segmented-item" data-active={history === !!index} aria-pressed={history === !!index} onClick={() => setParams(index ? { view: 'history' } : {})}>{label}</button>)}</div>
    <LoadState loading={logs.loading} error={logs.error} retry={logs.retry} />
    {!logs.loading && !logs.error && (history ? <><LoadState error={coffees.error} retry={coffees.retry} /><DrinkHistory drinks={drinks} beans={coffees.data ?? []} unit={unit} /></> : types.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{types.map(type => {
      const matches = drinks.filter(d => d.drink_type === type);
      const beanCount = new Set(matches.map(d => d.bean_id)).size;
      return <Link key={type} to={`/drinks/type/${encodeURIComponent(type)}`} className="card type-card group p-5"><div className="mb-5 flex items-start justify-between"><div className="type-illustration"><DrinkGlyph type={type} className="h-24 w-24" /></div><ArrowUpRight size={20} className="text-muted group-hover:text-accent" /></div><h2 className="text-xl font-bold">{type}</h2><p className="mt-1 text-sm text-muted">{matches.length} brews · {beanCount} {beanCount === 1 ? 'bean' : 'beans'} explored</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Star size={15} className="text-star" fill="currentColor" />{averageRating(matches).toFixed(1)}<span className="font-normal text-muted">average</span></span><span className="text-xs font-semibold text-accent">Explore beans →</span></div></Link>;
    })}</div> : <div className="card empty-state"><DrinkGlyph type="Espresso" className="mx-auto h-24 w-24" /><h2>Every great recipe starts with a cup.</h2><p>Your drink collection grows as you brew. Start with your first log.</p><Link className="btn btn-primary" to="/">Log your first drink</Link></div>)}
  </div>;
}
