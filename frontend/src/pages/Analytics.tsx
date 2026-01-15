import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';
import { DrinkLog } from '../utils/types';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function Analytics() {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);

  useEffect(() => {
    apiGet<DrinkLog[]>('/api/drinks').then(setDrinks);
  }, []);

  const ratingsByDay = Object.values(
    drinks.reduce((acc, drink) => {
      const day = drink.created_at.split('T')[0];
      if (!acc[day]) {
        acc[day] = { day, ratings: [] as number[] };
      }
      acc[day].ratings.push(drink.overall_rating);
      return acc;
    }, {} as Record<string, { day: string; ratings: number[] }> )
  ).map((entry) => ({
    day: entry.day,
    average: entry.ratings.reduce((sum, val) => sum + val, 0) / entry.ratings.length
  }));

  const byMaker = Object.values(
    drinks.reduce((acc, drink) => {
      const maker = drink.made_by || 'Unknown';
      if (!acc[maker]) {
        acc[maker] = { maker, total: 0 };
      }
      acc[maker].total += 1;
      return acc;
    }, {} as Record<string, { maker: string; total: number }>)
  );

  return (
    <div className="grid two">
      <section className="card" style={{ height: 260 }}>
        <h3>Average Rating Over Time</h3>
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={ratingsByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke="#9c6b4f" />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="card" style={{ height: 260 }}>
        <h3>Drinks by Maker</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={byMaker}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="maker" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#9c6b4f" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
