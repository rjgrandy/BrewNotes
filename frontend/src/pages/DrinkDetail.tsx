import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { DRINK_TYPES } from '../utils/constants';
import { inputMatchesMl, inputToMl, volumeToInput } from '../utils/units';
import SegmentedControl from '../components/SegmentedControl';
import StarRating from '../components/StarRating';
import PhotoField from '../components/PhotoField';

export default function DrinkDetail({ unit }: { unit: string }) {
  const { drinkId } = useParams();
  const navigate = useNavigate();
  const [drink, setDrink] = useState<DrinkLog | null>(null);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [coffeeVolumeInput, setCoffeeVolumeInput] = useState('');
  const [milkVolumeInput, setMilkVolumeInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!drinkId) return;
    const load = async () => {
      try {
        const [drinkRes, beansRes] = await Promise.all([
          apiGet<DrinkLog>(`/api/drinks/${drinkId}`),
          apiGet<Bean[]>('/api/beans?include_archived=true')
        ]);
        setDrink(drinkRes);
        setBeans(beansRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load drink');
      }
    };
    load();
  }, [drinkId]);

  useEffect(() => {
    if (!drink) return;
    setCoffeeVolumeInput((prev) =>
      inputMatchesMl(prev, drink.coffee_volume_ml, unit) ? prev : volumeToInput(drink.coffee_volume_ml, unit)
    );
    setMilkVolumeInput((prev) =>
      inputMatchesMl(prev, drink.milk_volume_ml, unit) ? prev : volumeToInput(drink.milk_volume_ml, unit)
    );
  }, [drink?.coffee_volume_ml, drink?.milk_volume_ml, unit]);

  const handleUpdate = async () => {
    if (!drink || !drinkId) return;
    setError('');
    try {
      const updated = await apiSend<DrinkLog>(`/api/drinks/${drinkId}`, 'PUT', drink);
      setDrink(updated);
      setMessage('Saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    }
  };

  const handleDelete = async () => {
    if (!drinkId) return;
    if (!window.confirm('Delete this drink log?')) return;
    await apiSend(`/api/drinks/${drinkId}`, 'DELETE');
    navigate('/drinks');
  };

  const handleUpload = async (blob: Blob) => {
    if (!drinkId) return;
    const updated = await uploadFile<DrinkLog>(`/api/drinks/${drinkId}/photo`, blob);
    setDrink(updated);
  };

  const updateVolume = (field: 'coffee_volume_ml' | 'milk_volume_ml', value: string) => {
    if (!drink) return;

    if (field === 'coffee_volume_ml') {
      setCoffeeVolumeInput(value);
    } else {
      setMilkVolumeInput(value);
    }

    const ml = inputToMl(value, unit);
    if (ml === null) {
      return;
    }

    setDrink({
      ...drink,
      [field]: ml
    });
  };

  const normalizeVolumeOnBlur = (field: 'coffee_volume_ml' | 'milk_volume_ml') => {
    if (!drink) return;
    const value = field === 'coffee_volume_ml' ? coffeeVolumeInput : milkVolumeInput;
    if (value.trim() !== '') {
      return;
    }

    setDrink({
      ...drink,
      [field]: 0
    });
  };

  if (!drink) {
    return <div className="card">{error || 'Loading...'}</div>;
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
      {message && <span className="label">{message}</span>}
      {error && <span className="label error-text">{error}</span>}
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
          <div className="chip-row" role="tablist" aria-label="Drink Type">
            {DRINK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={drink.drink_type === type}
                className={drink.drink_type === type ? 'chip active' : 'chip'}
                onClick={() => setDrink({ ...drink, drink_type: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </label>
      </div>
      <div className="grid two">
        <div className="stack">
          <span className="label">Strength</span>
          <SegmentedControl
            value={drink.strength_level}
            ariaLabel="Strength level"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' }
            ]}
            onChange={(value) => setDrink({ ...drink, strength_level: value })}
          />
        </div>
        <div className="stack">
          <span className="label">Temperature</span>
          <SegmentedControl
            value={drink.temperature_level}
            ariaLabel="Temperature level"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' }
            ]}
            onChange={(value) => setDrink({ ...drink, temperature_level: value })}
          />
        </div>
        <div className="stack">
          <span className="label">Body</span>
          <SegmentedControl
            value={drink.body_level}
            ariaLabel="Body level"
            options={[
              { value: 'LIGHT', label: 'Light' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'BOLD', label: 'Bold' }
            ]}
            onChange={(value) => setDrink({ ...drink, body_level: value })}
          />
        </div>
        <div className="stack">
          <span className="label">Order</span>
          <SegmentedControl
            value={drink.order}
            ariaLabel="Pour order"
            options={[
              { value: 'COFFEE_FIRST', label: 'Coffee First' },
              { value: 'MILK_FIRST', label: 'Milk First' }
            ]}
            onChange={(value) => setDrink({ ...drink, order: value })}
          />
        </div>
        <label className="stack">
          <span className="label">Coffee Volume ({unit})</span>
          <input
            type="number"
            min="0"
            step={unit === 'oz' ? '0.1' : '5'}
            value={coffeeVolumeInput}
            onChange={(event) => updateVolume('coffee_volume_ml', event.target.value)}
            onBlur={() => normalizeVolumeOnBlur('coffee_volume_ml')}
          />
        </label>
        <label className="stack">
          <span className="label">Milk Volume ({unit})</span>
          <input
            type="number"
            min="0"
            step={unit === 'oz' ? '0.1' : '5'}
            value={milkVolumeInput}
            onChange={(event) => updateVolume('milk_volume_ml', event.target.value)}
            onBlur={() => normalizeVolumeOnBlur('milk_volume_ml')}
          />
        </label>
        <label className="stack">
          <span className="label">Grind (1-7)</span>
          <div className="range-field">
            <input
              type="range"
              min="1"
              max="7"
              value={drink.grind_setting}
              onChange={(event) => setDrink({ ...drink, grind_setting: Number(event.target.value) })}
            />
            <span className="range-value">{drink.grind_setting}</span>
          </div>
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Overall Rating</span>
          <StarRating
            label="Overall Rating"
            value={drink.overall_rating}
            onChange={(value) => setDrink({ ...drink, overall_rating: value })}
          />
        </label>
        <label className="stack">
          <span className="label balance-label">Sour · Balanced · Bitter</span>
          <SegmentedControl
            value={String(drink.balance)}
            ariaLabel="Sour to bitter balance"
            className="balance-scale"
            hideLabels
            options={[
              { value: '1', label: 'Sour', ariaLabel: 'Sour' },
              { value: '2', label: 'Leans Sour', ariaLabel: 'Leans Sour' },
              { value: '3', label: 'Balanced', ariaLabel: 'Balanced' },
              { value: '4', label: 'Leans Bitter', ariaLabel: 'Leans Bitter' },
              { value: '5', label: 'Bitter', ariaLabel: 'Bitter' }
            ]}
            onChange={(value) => setDrink({ ...drink, balance: Number(value) })}
          />
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span className="label">Made By</span>
          <input value={drink.made_by || ''} onChange={(event) => setDrink({ ...drink, made_by: event.target.value })} />
        </label>
        <label className="stack">
          <span className="label">Notes</span>
          <textarea value={drink.notes || ''} onChange={(event) => setDrink({ ...drink, notes: event.target.value })} />
        </label>
      </div>
      <PhotoField
        label="Drink Photo"
        photoUrl={drink.photo_path}
        thumbnailUrl={drink.thumbnail_path}
        editorTitle="Edit Drink Photo"
        onSave={handleUpload}
      />
    </section>
  );
}
