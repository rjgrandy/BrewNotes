import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Bean as BeanIcon, Plus, Star } from 'lucide-react';
import { Bean, DrinkLog } from '../utils/types';
import { averageRating, drinkDate } from '../utils/history';
import { useResource } from '../utils/useResource';
import { mediaUrl } from '../utils/media';
import DrinkGlyph from '../components/DrinkGlyph';
import DrinkHistory from '../components/DrinkHistory';
import LoadState from '../components/LoadState';

export default function DrinkTypeDetail({ unit }: { unit: string }) {
  const { drinkType = '' } = useParams();
  const logs = useResource<DrinkLog[]>(`/api/drinks?drink_type=${encodeURIComponent(drinkType)}`);
  const coffees = useResource<Bean[]>('/api/beans?include_archived=true');
  const [params, setParams] = useSearchParams();
  const sort = params.get('beanSort') || 'rating';
  const drinks = logs.data ?? [];
  const groups = [...new Set(drinks.map(d => d.bean_id))].map(id => {
    const matches = drinks.filter(d => d.bean_id === id);
    return { id, bean: coffees.data?.find(b => b.id === id), count: matches.length, average: averageRating(matches), best: Math.max(...matches.map(d => d.overall_rating)), latest: Math.max(...matches.map(d => drinkDate(d.created_at).getTime())) };
  }).sort((a, b) => sort === 'name' ? (a.bean?.name || '').localeCompare(b.bean?.name || '') : sort === 'count' ? b.count - a.count || b.average - a.average : sort === 'recent' ? b.latest - a.latest : b.average - a.average || b.count - a.count);
  return <div className="flex flex-col gap-6">
    <Link className="back-link" to="/drinks"><ArrowLeft size={16} /> All drink types</Link>
    <section className="journal-hero flex flex-wrap items-center gap-5"><DrinkGlyph type={drinkType} className="h-28 w-28" /><div className="flex-1"><p className="eyebrow">Find your favorite pairing</p><h1 className="text-3xl font-bold">{drinkType}</h1><p className="mt-2 text-sm text-muted">{drinks.length} brews · {groups.length} beans explored{drinks.length > 0 ? ` · ${averageRating(drinks).toFixed(1)} average rating` : ''}</p></div><Link className="btn btn-primary" to={`/?type=${encodeURIComponent(drinkType)}`}><Plus size={16} /> Brew {drinkType}</Link></section>
    <LoadState loading={logs.loading} error={logs.error} retry={logs.retry} /><LoadState error={coffees.error} retry={coffees.retry} />
    {!logs.loading && !logs.error && <>
      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Beans you’ve used</h2><p className="text-sm text-muted">Ratings from your {drinkType.toLowerCase()} logs.</p></div><select aria-label="Sort beans used" className="input w-auto" value={sort} onChange={e => setParams(prev => { const next = new URLSearchParams(prev); next.set('beanSort', e.target.value); return next; }, { replace: true })}><option value="rating">Highest average rating</option><option value="count">Most brewed</option><option value="recent">Recently brewed</option><option value="name">Name A–Z</option></select></div>
        <div className="grid gap-3 sm:grid-cols-2">{groups.map(group => {
          const photo = mediaUrl(group.bean?.thumbnail_path);
          return <article key={group.id} className="card p-4"><Link to={`/beans/${group.id}`} className="flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-muted">{photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <BeanIcon size={23} className="text-accent" />}</div><div className="min-w-0 flex-1"><h3 className="font-bold">{group.bean?.name || 'Bean unavailable'}</h3><p className="text-xs text-muted">{group.bean?.roaster || 'Roaster not set'}{group.bean?.archived && ' · Archived'}</p></div><ArrowUpRight size={17} className="text-muted" /></Link><div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="flex items-center gap-1 font-semibold"><Star size={14} className="text-star" fill="currentColor" />{group.average.toFixed(1)} <span className="font-normal text-muted">avg</span></span><span className="text-muted">{group.count} brews</span><span className="text-muted">Best {group.best}/5</span></div><div className="mt-4 flex flex-wrap gap-2"><Link className="btn flex-1 text-xs" to={`/beans/${group.id}?type=${encodeURIComponent(drinkType)}`}>View brews</Link><Link className="btn flex-1 text-xs" to={`/?bean=${group.id}&type=${encodeURIComponent(drinkType)}`}>Brew this pairing</Link></div></article>;
        })}</div>
      </section>
      <section><h2 className="mb-4 text-xl font-bold">{drinkType} history</h2><DrinkHistory drinks={drinks} beans={coffees.data ?? []} unit={unit} fixedType={drinkType} /></section>
    </>}
  </div>;
}
