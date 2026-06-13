import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, RotateCcw } from 'lucide-react';
import { apiGet } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { formatVolume } from '../utils/units';
import DrinkGlyph from '../components/DrinkGlyph';

const STRENGTH_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'Strong' };
const BODY_LABEL: Record<string, string> = { LIGHT: 'Light', MEDIUM: 'Medium', BOLD: 'Bold' };

export default function Drinks({ unit }: { unit: string }) {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');
  const [drinkType, setDrinkType] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'rating'>('newest');

  useEffect(() => {
    // Fetch independently so a beans-API failure can't blank the drink history;
    // bean names just fall back to "Unknown bean" until beans load.
    apiGet<DrinkLog[]>('/api/drinks')
      .then(setDrinks)
      .catch((err) => console.error('Failed to load drinks', err));
    apiGet<Bean[]>('/api/beans?include_archived=true')
      .then(setBeans)
      .catch((err) => console.error('Failed to load beans', err));
  }, []);

  const beanName = (beanId: string) => beans.find((bean) => bean.id === beanId)?.name || 'Unknown bean';
  const beanLabel = (beanId: string) => {
    const bean = beans.find((b) => b.id === beanId);
    if (!bean) return 'Unknown bean';
    return bean.roaster ? `${bean.roaster} — ${bean.name}` : bean.name;
  };
  const uniqueTypes = useMemo(() => Array.from(new Set(drinks.map((d) => d.drink_type))), [drinks]);

  const filtered = useMemo(
    () =>
      drinks
        .filter((drink) => (rating === 'all' ? true : drink.overall_rating >= Number(rating)))
        .filter((drink) => (drinkType === 'all' ? true : drink.drink_type === drinkType))
        .filter((drink) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return [drink.drink_type, drink.notes, beanName(drink.bean_id)].some((item) =>
            (item || '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (sort === 'oldest') return a.created_at.localeCompare(b.created_at);
          if (sort === 'rating') return b.overall_rating - a.overall_rating || b.created_at.localeCompare(a.created_at);
          return b.created_at.localeCompare(a.created_at);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drinks, beans, search, rating, drinkType, sort]
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drinks</h1>
        <p className="text-sm text-muted">Every brew you've logged, newest first.</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search bean, type, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="input sm:w-36" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="rating">Highest rated</option>
        </select>
        <select className="input sm:w-36" value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="all">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4+ stars</option>
          <option value="3">3+ stars</option>
        </select>
        <select className="input sm:w-40" value={drinkType} onChange={(e) => setDrinkType(e.target.value)}>
          <option value="all">All types</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-muted">No drinks match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((drink) => (
            <Link
              key={drink.id}
              to={`/drinks/${drink.id}`}
              className="card flex gap-3 p-3 transition-transform hover:-translate-y-0.5"
            >
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-surface-muted">
                <DrinkGlyph type={drink.drink_type} className="h-16 w-16" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold leading-tight">{drink.drink_type}</h3>
                    <p className="truncate text-xs text-muted">{beanLabel(drink.bean_id)}</p>
                    <p className="text-xs text-muted">{new Date(drink.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="badge badge-gold shrink-0">
                    <Star size={12} fill="currentColor" strokeWidth={0} /> {drink.overall_rating}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span>
                    <span className="font-semibold text-text">{formatVolume(drink.coffee_volume_ml, unit)}</span> coffee
                  </span>
                  <span>
                    <span className="font-semibold text-text">{formatVolume(drink.milk_volume_ml, unit)}</span> milk
                  </span>
                  <span>{STRENGTH_LABEL[drink.strength_level]} strength</span>
                  <span>{BODY_LABEL[drink.body_level]} body</span>
                </div>
                {drink.would_make_again && (
                  <span className="mt-auto inline-flex w-fit items-center gap-1 pt-1 text-xs font-semibold text-success">
                    <RotateCcw size={12} /> Make again
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
