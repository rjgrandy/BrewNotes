import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '../utils/api';
import { Bean, DrinkLog } from '../utils/types';
import { DEFAULT_RATINGS, DEFAULT_SETTINGS, DRINK_TYPES } from '../utils/constants';
import { formatVolume, ozToMl } from '../utils/units';
import { addRecentName, getDefaultName, getRecentNames } from '../utils/attribution';
import SegmentedControl from '../components/SegmentedControl';
import StarRating from '../components/StarRating';

const defaultDrink = {
  custom_label: '',
  notes: '',
  ...DEFAULT_SETTINGS,
  ...DEFAULT_RATINGS
};

type Props = { unit: string };

export default function Dashboard({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [beanId, setBeanId] = useState('');
  const [drinkType, setDrinkType] = useState(DRINK_TYPES[0]);
  const [form, setForm] = useState(defaultDrink);
  const [madeBy, setMadeBy] = useState(getDefaultName());
  const [message, setMessage] = useState('');
  const recentNames = useMemo(() => getRecentNames(), []);

  useEffect(() => {
    const load = async () => {
      const beansRes = await apiGet<Bean[]>('/api/beans');
      const drinksRes = await apiGet<DrinkLog[]>('/api/drinks');
      setBeans(beansRes);
      setDrinks(drinksRes);
      if (beansRes[0]) {
        setBeanId(beansRes[0].id);
      }
    };
    load();
  }, []);

  const lastDrink = useMemo(() => {
    return drinks.find((drink) => drink.bean_id === beanId && drink.drink_type === drinkType);
  }, [drinks, beanId, drinkType]);

  const beanBest = useMemo(() => {
    const bean = beans.find((item) => item.id === beanId);
    return bean?.current_best_settings || null;
  }, [beans, beanId]);

  const applySettings = (settings: Partial<typeof defaultDrink>) => {
    setForm((prev) => ({
      ...prev,
      ...settings
    }));
  };

  const extractSettings = (drink: DrinkLog) => ({
    temperature_level: drink.temperature_level,
    body_level: drink.body_level,
    order: drink.order,
    coffee_volume_ml: drink.coffee_volume_ml,
    milk_volume_ml: drink.milk_volume_ml,
    strength_level: drink.strength_level,
    grind_setting: drink.grind_setting
  });

  const handleSubmit = async () => {
    if (!beanId) return;
    const payload = {
      bean_id: beanId,
      drink_type: drinkType,
      custom_label: form.custom_label,
      made_by: madeBy,
      rated_by: madeBy,
      temperature_level: form.temperature_level,
      body_level: form.body_level,
      order: form.order,
      coffee_volume_ml: form.coffee_volume_ml,
      milk_volume_ml: form.milk_volume_ml,
      strength_level: form.strength_level,
      grind_setting: form.grind_setting,
      overall_rating: form.overall_rating,
      sweetness: form.sweetness,
      bitterness: form.bitterness,
      acidity: form.acidity,
      body_mouthfeel: form.body_mouthfeel,
      balance: form.balance,
      would_make_again: form.would_make_again,
      dialed_in: form.dialed_in,
      notes: form.notes
    };
    const created = await apiSend<DrinkLog>('/api/drinks', 'POST', payload);
    setDrinks((prev) => [created, ...prev]);
    addRecentName(madeBy);
    setMessage('Saved!');
    setTimeout(() => setMessage(''), 2000);
  };

  const updateVolume = (field: 'coffee_volume_ml' | 'milk_volume_ml', value: string) => {
    const num = Number(value) || 0;
    setForm((prev) => ({
      ...prev,
      [field]: unit === 'oz' ? ozToMl(num) : num
    }));
  };

  const saveBeanBest = async () => {
    const bean = beans.find((item) => item.id === beanId);
    if (!bean) return;
    const updated = await apiSend<Bean>(`/api/beans/${beanId}`, 'PUT', {
      ...bean,
      current_best_settings: {
        temperature_level: form.temperature_level,
        body_level: form.body_level,
        order: form.order,
        coffee_volume_ml: form.coffee_volume_ml,
        milk_volume_ml: form.milk_volume_ml,
        strength_level: form.strength_level,
        grind_setting: form.grind_setting
      }
    });
    setBeans((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setMessage('Saved as bean best.');
  };

  return (
    <div className="grid two">
      <section className="card stack">
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Fast Drink Entry</h3>
          <span className="badge">KF7 ready</span>
        </div>
        <label className="stack">
          <span className="label">Bean</span>
          <select value={beanId} onChange={(event) => setBeanId(event.target.value)}>
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
                aria-selected={drinkType === type}
                className={drinkType === type ? 'chip active' : 'chip'}
                onClick={() => setDrinkType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </label>
        <div className="inline">
          <button
            onClick={() => lastDrink && applySettings(extractSettings(lastDrink))}
            disabled={!lastDrink}
          >
            Clone last (bean + drink)
          </button>
          <button
            onClick={() => beanBest && applySettings(beanBest as Partial<typeof defaultDrink>)}
            disabled={!beanBest}
          >
            Use bean best
          </button>
          <button className="primary" onClick={saveBeanBest}>
            Save as bean best
          </button>
        </div>
        <div className="grid two">
          <div className="stack">
            <span className="label">Strength</span>
            <SegmentedControl
              value={form.strength_level}
              ariaLabel="Strength level"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'EXTRA', label: 'Extra' }
              ]}
              onChange={(value) => setForm({ ...form, strength_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Temperature</span>
            <SegmentedControl
              value={form.temperature_level}
              ariaLabel="Temperature level"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' }
              ]}
              onChange={(value) => setForm({ ...form, temperature_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Body</span>
            <SegmentedControl
              value={form.body_level}
              ariaLabel="Body level"
              options={[
                { value: 'LIGHT', label: 'Light' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'BOLD', label: 'Bold' }
              ]}
              onChange={(value) => setForm({ ...form, body_level: value })}
            />
          </div>
          <div className="stack">
            <span className="label">Order</span>
            <SegmentedControl
              value={form.order}
              ariaLabel="Pour order"
              options={[
                { value: 'COFFEE_FIRST', label: 'Coffee First' },
                { value: 'MILK_FIRST', label: 'Milk First' }
              ]}
              onChange={(value) => setForm({ ...form, order: value })}
            />
          </div>
          <label className="stack">
            <span className="label">Coffee Volume ({unit})</span>
            <input
              type="number"
              value={unit === 'oz' ? (form.coffee_volume_ml / 29.5735).toFixed(1) : form.coffee_volume_ml}
              onChange={(event) => updateVolume('coffee_volume_ml', event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="label">Milk Volume ({unit})</span>
            <input
              type="number"
              value={unit === 'oz' ? (form.milk_volume_ml / 29.5735).toFixed(1) : form.milk_volume_ml}
              onChange={(event) => updateVolume('milk_volume_ml', event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="label">Grind (1-7)</span>
            <div className="range-field">
              <input
                type="range"
                min="1"
                max="7"
                value={form.grind_setting}
                onChange={(event) => setForm({ ...form, grind_setting: Number(event.target.value) })}
              />
              <span className="range-value">{form.grind_setting}</span>
            </div>
          </label>
        </div>
        <div className="grid two">
          <label className="stack">
            <span className="label">Overall Rating</span>
            <StarRating label="Overall Rating" value={form.overall_rating} onChange={(value) => setForm({ ...form, overall_rating: value })} />
          </label>
          <label className="stack">
            <span className="label">Taste</span>
            <StarRating label="Taste" value={form.body_mouthfeel} onChange={(value) => setForm({ ...form, body_mouthfeel: value })} />
          </label>
          <label className="stack">
            <span className="label">Sour · Balanced · Bitter</span>
            <SegmentedControl
              value={String(form.balance)}
              ariaLabel="Sour to bitter balance"
              className="balance-scale"
              options={[
                { value: '1', label: 'Sour' },
                { value: '2', label: 'Leans Sour' },
                { value: '3', label: 'Balanced' },
                { value: '4', label: 'Leans Bitter' },
                { value: '5', label: 'Bitter' }
              ]}
              onChange={(value) => setForm({ ...form, balance: Number(value) })}
            />
          </label>
        </div>
        <div className="grid two">
          <label className="stack">
            <span className="label">Made By</span>
            <input list="names" value={madeBy} onChange={(event) => setMadeBy(event.target.value)} />
          </label>
          <datalist id="names">
            {recentNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <label className="stack">
            <span className="label">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <button className="primary" onClick={handleSubmit}>
          Save Drink
        </button>
        {message && <span className="label">{message}</span>}
      </section>
      <section className="stack">
        <div className="card">
          <h3>Recent Drinks</h3>
          <div className="stack">
            {drinks.slice(0, 5).map((drink) => (
              <div key={drink.id} className="inline" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div>{drink.drink_type}</div>
                  <div className="label">
                    {formatVolume(drink.coffee_volume_ml, unit)} · Grind {drink.grind_setting}
                  </div>
                </div>
                <span className="badge">{drink.overall_rating}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Hall of Fame (30 days)</h3>
          <div className="stack">
            {drinks
              .filter((drink) => drink.overall_rating >= 4)
              .slice(0, 5)
              .map((drink) => (
                <div key={drink.id} className="inline" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div>{drink.drink_type}</div>
                    <div className="label">{drink.notes || 'No notes'}</div>
                  </div>
                  <span className="badge">{drink.overall_rating}</span>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
