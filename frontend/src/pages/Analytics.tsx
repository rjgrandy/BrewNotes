import { useEffect, useMemo, useState, ReactElement } from 'react';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { apiGet } from '../utils/api';
import { DrinkLog } from '../utils/types';

const CHART_COLOR = 'var(--accent)';

export default function Analytics() {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);

  useEffect(() => {
    apiGet<DrinkLog[]>('/api/drinks').then(setDrinks);
  }, []);

  const ratingsByDay = useMemo(
    () =>
      Object.values(
        drinks.reduce((acc, drink) => {
          const day = drink.created_at.split('T')[0];
          if (!acc[day]) acc[day] = { day, ratings: [] as number[] };
          acc[day].ratings.push(drink.overall_rating);
          return acc;
        }, {} as Record<string, { day: string; ratings: number[] }>)
      )
        .map((entry) => ({
          day: entry.day,
          average: entry.ratings.reduce((sum, val) => sum + val, 0) / entry.ratings.length
        }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    [drinks]
  );

  const byMaker = useMemo(
    () =>
      Object.values(
        drinks.reduce((acc, drink) => {
          const maker = drink.made_by || 'Unknown';
          if (!acc[maker]) acc[maker] = { maker, total: 0 };
          acc[maker].total += 1;
          return acc;
        }, {} as Record<string, { maker: string; total: number }>)
      ).sort((a, b) => b.total - a.total),
    [drinks]
  );

  const avgRating = drinks.length
    ? (drinks.reduce((sum, d) => sum + d.overall_rating, 0) / drinks.length).toFixed(1)
    : '–';
  const dialedIn = drinks.filter((d) => d.dialed_in).length;
  const makeAgain = drinks.filter((d) => d.would_make_again).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="text-sm text-muted">How your brewing is trending across every bean.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Drinks logged" value={String(drinks.length)} />
        <Stat label="Avg rating" value={avgRating} />
        <Stat label="Dialed in" value={String(dialedIn)} />
        <Stat label="Make again" value={String(makeAgain)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Average rating over time">
          <LineChart data={ratingsByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 5]} />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Drinks by maker">
          <BarChart data={byMaker}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="maker" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="field-label">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="card p-4">
      <h3 className="section-title mb-2">{title}</h3>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
