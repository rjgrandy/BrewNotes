import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { formatVolume } from '../utils/units';

export default function Drinks({ unit }: { unit: string }) {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');
  const [drinkType, setDrinkType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [searchParams, setSearchParams] = useSearchParams();
  const beanFilter = searchParams.get('bean') || 'all';

  useEffect(() => {
    Promise.all([apiGet<DrinkLog[]>('/api/drinks'), apiGet<Bean[]>('/api/beans?include_archived=true')]).then(
      ([drinksRes, beansRes]) => {
        setDrinks(drinksRes);
        setBeans(beansRes);
      }
    );
  }, []);

  const beanName = (beanId: string) => beans.find((bean) => bean.id === beanId)?.name || 'Unknown bean';
  const uniqueTypes = Array.from(new Set(drinks.map((drink) => drink.drink_type)));
  const filteredDrinks = drinks
    .filter((drink) => (rating === 'all' ? true : drink.overall_rating >= Number(rating)))
    .filter((drink) => (drinkType === 'all' ? true : drink.drink_type === drinkType))
    .filter((drink) => (beanFilter === 'all' ? true : drink.bean_id === beanFilter))
    .filter((drink) => {
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return [drink.drink_type, drink.notes, beanName(drink.bean_id)].some((item) => (item || '').toLowerCase().includes(query));
    })
    .sort((a, b) => sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : sort === 'rating' ? b.overall_rating - a.overall_rating || b.created_at.localeCompare(a.created_at) : sort === 'type' ? a.drink_type.localeCompare(b.drink_type) : b.created_at.localeCompare(a.created_at));

  return (
    <section className="stack">
      <div className="card stack">
        <h3 style={{ marginBottom: 0 }}>Review Drink History</h3>
        <div className="grid three">
          <label className="stack">
            <span className="label">Bean</span>
            <select value={beanFilter} onChange={(event) => { const next = new URLSearchParams(searchParams); event.target.value === 'all' ? next.delete('bean') : next.set('bean', event.target.value); setSearchParams(next); }}><option value="all">All Beans</option>{beans.map((bean) => <option key={bean.id} value={bean.id}>{bean.name}</option>)}</select>
          </label>
          <label className="stack">
            <span className="label">Search</span>
            <input
              placeholder="Bean, drink type, or notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="label">Minimum Rating</span>
            <select value={rating} onChange={(event) => setRating(event.target.value)}>
              <option value="all">All Ratings</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
          </label>
          <label className="stack">
            <span className="label">Drink Type</span>
            <select value={drinkType} onChange={(event) => setDrinkType(event.target.value)}>
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="stack"><span className="label">Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="rating">Highest rated</option><option value="type">Drink type</option></select></label>
        </div>
      </div>
      {filteredDrinks.length === 0 && (
        <div className="card">
          <p className="label">No drinks match. Log one from the Dashboard.</p>
        </div>
      )}
      {filteredDrinks.map((drink) => (
        <div key={drink.id} className="card drink-row">
          {drink.thumbnail_path && <img className="table-photo" src={drink.thumbnail_path} alt={drink.drink_type} />}
          <div className="inline" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{drink.drink_type}</h3>
              <p className="label">
                <Link to={`/beans/${drink.bean_id}`}>{beanName(drink.bean_id)}</Link> · {new Date(drink.created_at).toLocaleDateString()}
              </p>
              <p className="label">
                {formatVolume(drink.coffee_volume_ml, unit)} · {drink.temperature_level} · Grind {drink.grind_setting}
              </p>
            </div>
            <span className="badge">{drink.overall_rating}/5</span>
          </div>
          <p>{drink.notes || 'No notes yet.'}</p>
          <Link to={`/drinks/${drink.id}`}>View / Edit</Link>
        </div>
      ))}
    </section>
  );
}
