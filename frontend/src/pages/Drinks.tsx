import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../utils/api';
import { DrinkLog } from '../utils/types';
import { formatVolume } from '../utils/units';

export default function Drinks({ unit }: { unit: string }) {
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);

  useEffect(() => {
    apiGet<DrinkLog[]>('/api/drinks').then(setDrinks);
  }, []);

  return (
    <section className="stack">
      {drinks.map((drink) => (
        <div key={drink.id} className="card">
          <div className="inline" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{drink.drink_type}</h3>
              <p className="label">
                {formatVolume(drink.coffee_volume_ml, unit)} · {drink.temperature_level} · Grind {drink.grind_setting}
              </p>
            </div>
            <span className="badge">{drink.overall_rating}</span>
          </div>
          <p>{drink.notes || 'No notes yet.'}</p>
          <Link to={`/drinks/${drink.id}`}>View / Edit</Link>
        </div>
      ))}
    </section>
  );
}
