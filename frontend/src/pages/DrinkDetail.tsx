import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { DRINK_TYPES } from '../utils/constants';
import { ozToMl } from '../utils/units';

export default function DrinkDetail({ unit }: { unit: string }) {
  const { drinkId } = useParams();
  const navigate = useNavigate();
  const [drink, setDrink] = useState<DrinkLog | null>(null);
  const [beans, setBeans] = useState<Bean[]>([]);

  useEffect(() => {
    if (!drinkId) return;
    const load = async () => {
      const drinkRes = await apiGet<DrinkLog>(`/api/drinks/${drinkId}`);
      const beansRes = await apiGet<Bean[]>('/api/beans?include_archived=true');
      setDrink(drinkRes);
      setBeans(beansRes);
    };
    load();
  }, [drinkId]);

  const handleUpdate = async () => {
    if (!drink || !drinkId) return;
    const updated = await apiSend<DrinkLog>(`/api/drinks/${drinkId}`, 'PUT', drink);
    setDrink(updated);
  };

  const handleDelete = async () => {
    if (!drinkId) return;
    if (!window.confirm('Delete this drink log?')) return;
    await apiSend(`/api/drinks/${drinkId}`, 'DELETE');
    navigate('/drinks');
  };

  const handleUpload = async (file: File) => {
    if (!drinkId) return;
    const updated = await uploadFile<DrinkLog>(`/api/drinks/${drinkId}/photo`, file);
    setDrink(updated);
  };

  const updateVolume = (field: 'coffee_volume_ml' | 'milk_volume_ml', value: string) => {
    if (!drink) return;
    const num = Number(value) || 0;
    setDrink({
      ...drink,
      [field]: unit === 'oz' ? ozToMl(num) : num
    });
  };

  if (!drink) {
    return <div className="card">Loading...</div>;
  }

  return (
    <section className="card stack">
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <h3>Edit Drink</h3>
        <div className="inline">
          <button onClick={handleDelete}>Delete</button>
          <button className="primary" onClick={handleUpdate}>
            Save Changes
          </button>
        </div>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Bean</span>
          <select value={drink.bean_id} onChange={(event) => setDrink({ ...drink, bean_id: event.target.value })}>
            {beans.map((bean) => (
              <option key={bean.id} value={bean.id}>
                {bean.name}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          <span className="label">Drink Type</span>
          <select value={drink.drink_type} onChange={(event) => setDrink({ ...drink, drink_type: event.target.value })}>
            {DRINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Strength</span>
          <input value={drink.strength_level} onChange={(event) => setDrink({ ...drink, strength_level: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Temperature</span>
          <input value={drink.temperature_level} onChange={(event) => setDrink({ ...drink, temperature_level: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Body</span>
          <input value={drink.body_level} onChange={(event) => setDrink({ ...drink, body_level: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Order</span>
          <input value={drink.order} onChange={(event) => setDrink({ ...drink, order: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Coffee Volume ({unit})</span>
          <input
            type="number"
            value={unit === 'oz' ? (drink.coffee_volume_ml / 29.5735).toFixed(1) : drink.coffee_volume_ml}
            onChange={(event) => updateVolume('coffee_volume_ml', event.target.value)}
          />
        </label>
        <label className="stack">
          <span className="label">Milk Volume ({unit})</span>
          <input
            type="number"
            value={unit === 'oz' ? (drink.milk_volume_ml / 29.5735).toFixed(1) : drink.milk_volume_ml}
            onChange={(event) => updateVolume('milk_volume_ml', event.target.value)}
          />
        </label>
        <label className="stack">
          <span className="label">Grind Setting</span>
          <input
            type="number"
            min="1"
            max="7"
            value={drink.grind_setting}
            onChange={(event) => setDrink({ ...drink, grind_setting: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Overall Rating</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.overall_rating}
            onChange={(event) => setDrink({ ...drink, overall_rating: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span className="label">Sweetness</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.sweetness}
            onChange={(event) => setDrink({ ...drink, sweetness: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span className="label">Bitterness</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.bitterness}
            onChange={(event) => setDrink({ ...drink, bitterness: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span className="label">Acidity</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.acidity}
            onChange={(event) => setDrink({ ...drink, acidity: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span className="label">Body / Mouthfeel</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.body_mouthfeel}
            onChange={(event) => setDrink({ ...drink, body_mouthfeel: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span className="label">Balance</span>
          <input
            type="number"
            min="1"
            max="5"
            value={drink.balance}
            onChange={(event) => setDrink({ ...drink, balance: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Made By</span>
          <input value={drink.made_by || ''} onChange={(event) => setDrink({ ...drink, made_by: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Rated By</span>
          <input value={drink.rated_by || ''} onChange={(event) => setDrink({ ...drink, rated_by: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Notes</span>
          <textarea value={drink.notes || ''} onChange={(event) => setDrink({ ...drink, notes: event.target.value })} />
        </label>
      </div>
      <label className="stack">
        <span className="label">Photo</span>
        <input type="file" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])} />
      </label>
    </section>
  );
}
