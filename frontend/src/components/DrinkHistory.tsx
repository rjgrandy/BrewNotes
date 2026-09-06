import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Bean, DrinkLog } from '../utils/types';
import { filterDrinks } from '../utils/history';
import DrinkCard from './DrinkCard';

export default function DrinkHistory({ drinks, beans, unit, fixedBean, fixedType }: { drinks: DrinkLog[]; beans: Bean[]; unit: string; fixedBean?: string; fixedType?: string }) {
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => setParams(prev => { const next = new URLSearchParams(prev); value ? next.set(key, value) : next.delete(key); return next; }, { replace: true });
  const filters = { query: params.get('q') || '', type: fixedType || params.get('type') || '', bean: fixedBean || params.get('bean') || '', rating: params.get('rating') || '', sort: params.get('sort') || 'newest', favorite: params.get('again') === 'true' };
  const filtered = filterDrinks(drinks, beans, filters);
  const clear = () => setParams(prev => { const next = new URLSearchParams(prev); ['q', 'type', 'bean', 'rating', 'sort', 'again'].forEach(key => next.delete(key)); return next; }, { replace: true });
  return <div className="flex flex-col gap-4">
    <div className="card flex flex-col gap-3 p-4">
      <label className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input aria-label="Search drink history" className="input pl-10" placeholder="Search beans, notes, or who brewed it…" value={filters.query} onChange={e => update('q', e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <select aria-label="Sort drinks" className="input sm:w-auto" value={filters.sort} onChange={e => update('sort', e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="rating">Highest rated</option><option value="grind">Grind: fine to coarse</option></select>
        {!fixedType && <select aria-label="Filter drink type" className="input sm:w-auto" value={filters.type} onChange={e => update('type', e.target.value)}><option value="">All drink types</option>{[...new Set(drinks.map(d => d.drink_type))].sort().map(type => <option key={type}>{type}</option>)}</select>}
        {!fixedBean && <select aria-label="Filter bean" className="input sm:max-w-56 sm:w-auto" value={filters.bean} onChange={e => update('bean', e.target.value)}><option value="">All beans</option>{beans.filter(b => drinks.some(d => d.bean_id === b.id)).map(b => <option key={b.id} value={b.id}>{b.name}{b.archived ? ' (archived)' : ''}</option>)}</select>}
        <select aria-label="Filter rating" className="input sm:w-auto" value={filters.rating} onChange={e => update('rating', e.target.value)}><option value="">All ratings</option><option value="5">5 stars</option><option value="4">4+ stars</option><option value="3">3+ stars</option></select>
        <button className="chip justify-center" aria-pressed={filters.favorite} data-active={filters.favorite} onClick={() => update('again', filters.favorite ? '' : 'true')}>Would make again</button>
      </div>
    </div>
    <div className="flex items-center justify-between text-xs text-muted"><span aria-live="polite">{filtered.length} of {drinks.length} {drinks.length === 1 ? 'drink' : 'drinks'}</span><button className="inline-flex min-h-9 items-center gap-1 font-semibold hover:text-accent" onClick={clear}><SlidersHorizontal size={13} /> Reset filters</button></div>
    {filtered.length ? <div className="grid gap-3 sm:grid-cols-2">{filtered.map(drink => <DrinkCard key={drink.id} drink={drink} bean={beans.find(b => b.id === drink.bean_id)} unit={unit} />)}</div> : <div className="card empty-state"><h3>{drinks.length ? 'No matching brews' : 'Your next great cup starts here'}</h3><p>{drinks.length ? 'Try another search or reset your filters.' : 'Log a drink to start discovering your favorite recipes.'}</p>{drinks.length ? <button className="btn" onClick={clear}>Clear filters</button> : <Link className="btn btn-primary" to={`/?${new URLSearchParams({ ...(fixedBean ? { bean: fixedBean } : {}), ...(fixedType ? { type: fixedType } : {}) })}`}>Log a drink</Link>}</div>}
  </div>;
}
