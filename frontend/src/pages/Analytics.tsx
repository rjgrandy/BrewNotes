import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { DOSE_G_BY_STRENGTH } from '../utils/constants';
import { beanCostPerDrink, drinkCost, formatMoney } from '../utils/cost';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

const ACCENT = '#9c6b4f';

export default function Analytics() {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiGet<DrinkLog[]>('/api/drinks'), apiGet<Bean[]>('/api/beans?include_archived=true')])
      .then(([drinksRes, beansRes]) => {
        setDrinks(drinksRes);
        setBeans(beansRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load analytics'));
  }, []);

  const beanById = useMemo(() => new Map(beans.map((bean) => [bean.id, bean])), [beans]);

  const ratingsByDay = Object.values(
    drinks.reduce((acc, drink) => {
      const day = drink.created_at.split('T')[0];
      if (!acc[day]) {
        acc[day] = { day, ratings: [] as number[] };
      }
      acc[day].ratings.push(drink.overall_rating);
      return acc;
    }, {} as Record<string, { day: string; ratings: number[] }> )
  )
    .map((entry) => ({
      day: entry.day,
      average: entry.ratings.reduce((sum, val) => sum + val, 0) / entry.ratings.length
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const byMaker = Object.values(
    drinks.reduce((acc, drink) => {
      const maker = drink.made_by || 'Unknown';
      if (!acc[maker]) {
        acc[maker] = { maker, total: 0 };
      }
      acc[maker].total += 1;
      return acc;
    }, {} as Record<string, { maker: string; total: number }>)
  ).sort((a, b) => b.total - a.total);

  const costStats = useMemo(() => {
    const costs = drinks
      .map((drink) => drinkCost(drink, beanById.get(drink.bean_id)))
      .filter((cost): cost is number => cost !== null);
    const avgCost = costs.length ? costs.reduce((sum, val) => sum + val, 0) / costs.length : null;

    const monthKey = new Date().toISOString().slice(0, 7);
    const monthSpend = drinks
      .filter((drink) => drink.created_at.startsWith(monthKey))
      .reduce((sum, drink) => sum + (drinkCost(drink, beanById.get(drink.bean_id)) ?? 0), 0);

    const avgRating = drinks.length
      ? drinks.reduce((sum, drink) => sum + drink.overall_rating, 0) / drinks.length
      : null;

    return { avgCost, monthSpend, avgRating, priced: costs.length };
  }, [drinks, beanById]);

  const monthlySpend = useMemo(() => {
    const months = drinks.reduce((acc, drink) => {
      const cost = drinkCost(drink, beanById.get(drink.bean_id));
      if (cost === null) return acc;
      const month = drink.created_at.slice(0, 7);
      acc[month] = (acc[month] || 0) + cost;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(months)
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [drinks, beanById]);

  const costByBean = useMemo(
    () =>
      beans
        .map((bean) => ({ name: bean.name, cost: beanCostPerDrink(bean) }))
        .filter((entry): entry is { name: string; cost: number } => entry.cost !== null)
        .map((entry) => ({ ...entry, cost: Number(entry.cost.toFixed(2)) }))
        .sort((a, b) => b.cost - a.cost),
    [beans]
  );

  const money = formatMoney;

  return (
    <div className="stack">
      {error && <div className="card error-text">{error}</div>}
      <section className="stat-row">
        <div className="card stat-tile">
          <span className="label">Total drinks</span>
          <span className="stat-value">{drinks.length}</span>
        </div>
        <div className="card stat-tile">
          <span className="label">Average rating</span>
          <span className="stat-value">{costStats.avgRating === null ? '—' : costStats.avgRating.toFixed(1)}</span>
        </div>
        <div className="card stat-tile">
          <span className="label">Est. cost / drink</span>
          <span className="stat-value">{costStats.avgCost === null ? '—' : money(costStats.avgCost)}</span>
        </div>
        <div className="card stat-tile">
          <span className="label">Est. spend this month</span>
          <span className="stat-value">{costStats.priced ? money(costStats.monthSpend) : '—'}</span>
        </div>
      </section>
      <div className="grid two">
        <section className="card" style={{ height: 260 }}>
          <h3>Average Rating Over Time</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={ratingsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke={ACCENT} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
        <section className="card" style={{ height: 260 }}>
          <h3>Drinks by Maker</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={byMaker}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="maker" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card" style={{ height: 260 }}>
          <h3>Est. Cost per Drink by Bean</h3>
          {costByBean.length === 0 ? (
            <p className="label">Add a price and bag size to your beans to see cost analytics.</p>
          ) : (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={costByBean}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={money} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="cost" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
        <section className="card" style={{ height: 260 }}>
          <h3>Est. Monthly Coffee Spend</h3>
          {monthlySpend.length === 0 ? (
            <p className="label">Costs appear once drinks are logged against priced beans.</p>
          ) : (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={money} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="total" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
      <p className="label">
        Cost estimates assume the KF7 doses about {DOSE_G_BY_STRENGTH.LOW}g / {DOSE_G_BY_STRENGTH.MEDIUM}g /{' '}
        {DOSE_G_BY_STRENGTH.HIGH}g of beans per drink at Low / Medium / High strength.
      </p>
    </div>
  );
}
