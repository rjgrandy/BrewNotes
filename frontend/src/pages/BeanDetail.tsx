import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { Bean, BeanAnalytics, BeanBestSettings, DrinkLog, RecommendedSettings } from '../utils/types';
import { formatVolume, inputMatchesMl, inputToMl, volumeToInput } from '../utils/units';
import { beanCostPerDrink, formatMoney } from '../utils/cost';
import PhotoField from '../components/PhotoField';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const emptyBean: Partial<Bean> = {
  name: '',
  roaster: '',
  origin: '',
  process: '',
  roast_level: '',
  tasting_notes: '',
  notes: ''
};

type Props = { unit: string };

export default function BeanDetail({ unit }: Props) {
  const { beanId } = useParams();
  const [bean, setBean] = useState<Bean | null>(null);
  const [form, setForm] = useState<Partial<Bean>>(emptyBean);
  const [analytics, setAnalytics] = useState<BeanAnalytics | null>(null);
  const [recommended, setRecommended] = useState<RecommendedSettings | null>(null);
  const [bestVolumeInput, setBestVolumeInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [drinkSort, setDrinkSort] = useState('newest');

  useEffect(() => {
    if (!beanId) return;
    const load = async () => {
      try {
        const [beanRes, analyticsRes, recRes, drinksRes] = await Promise.all([
          apiGet<Bean>(`/api/beans/${beanId}`),
          apiGet<BeanAnalytics>(`/api/beans/${beanId}/analytics`),
          apiGet<RecommendedSettings>(`/api/beans/${beanId}/recommended-settings`),
          apiGet<DrinkLog[]>(`/api/drinks?bean_id=${encodeURIComponent(beanId)}`)
        ]);
        setBean(beanRes);
        setForm(beanRes);
        setAnalytics(analyticsRes);
        setRecommended(recRes);
        setDrinks(drinksRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load bean');
      }
    };
    load();
  }, [beanId]);

  const handleUpdate = async () => {
    if (!beanId) return;
    setError('');
    try {
      const updated = await apiSend<Bean>(`/api/beans/${beanId}`, 'PUT', form);
      setBean(updated);
      setForm(updated);
      setMessage('Saved!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    }
  };

  const handleArchive = async (archive: boolean) => {
    if (!beanId) return;
    const updated = await apiSend<Bean>(`/api/beans/${beanId}/${archive ? 'archive' : 'unarchive'}`, 'POST');
    setBean(updated);
    setForm((prev) => ({ ...prev, archived: updated.archived }));
  };

  const handleUpload = async (blob: Blob) => {
    if (!beanId) return;
    const updated = await uploadFile<Bean>(`/api/beans/${beanId}/photo`, blob);
    setBean(updated);
    setForm((prev) => ({ ...prev, image_path: updated.image_path, thumbnail_path: updated.thumbnail_path }));
  };

  const currentBest = (form.current_best_settings || {}) as BeanBestSettings;

  const sortedDrinks = useMemo(() => [...drinks].sort((a, b) => {
    if (drinkSort === 'oldest') return a.created_at.localeCompare(b.created_at);
    if (drinkSort === 'rating') return b.overall_rating - a.overall_rating || b.created_at.localeCompare(a.created_at);
    if (drinkSort === 'type') return a.drink_type.localeCompare(b.drink_type) || b.created_at.localeCompare(a.created_at);
    return b.created_at.localeCompare(a.created_at);
  }), [drinks, drinkSort]);

  useEffect(() => {
    const volumeMl = Number(currentBest.coffee_volume_ml || 0);
    setBestVolumeInput((prev) => (inputMatchesMl(prev, volumeMl, unit) ? prev : volumeToInput(volumeMl, unit)));
  }, [currentBest.coffee_volume_ml, unit]);

  if (!bean) {
    return <div className="card">{error || 'Loading...'}</div>;
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <h3>{bean.name}</h3>
          <div className="inline">
            <button onClick={() => handleArchive(!bean.archived)}>
              {bean.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button className="primary" onClick={handleUpdate}>
              Save Changes
            </button>
          </div>
        </div>
        {message && <span className="label">{message}</span>}
        {error && <span className="label error-text">{error}</span>}
        <PhotoField
          label="Bean Photo"
          photoUrl={bean.image_path}
          thumbnailUrl={bean.thumbnail_path}
          editorTitle="Edit Bean Photo"
          onSave={handleUpload}
        />
        <div className="grid two">
          <label className="stack">
            <span className="label">Name</span>
            <input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Roaster</span>
            <input value={form.roaster || ''} onChange={(event) => setForm({ ...form, roaster: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Origin</span>
            <input value={form.origin || ''} onChange={(event) => setForm({ ...form, origin: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Process</span>
            <input value={form.process || ''} onChange={(event) => setForm({ ...form, process: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Roast Level</span>
            <input value={form.roast_level || ''} onChange={(event) => setForm({ ...form, roast_level: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Tasting Notes</span>
            <input value={form.tasting_notes || ''} onChange={(event) => setForm({ ...form, tasting_notes: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Bag Size (g)</span>
            <input
              type="number"
              min="0"
              value={form.bag_size_g ?? ''}
              onChange={(event) =>
                setForm({ ...form, bag_size_g: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </label>
          <label className="stack">
            <span className="label">Price ($)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ''}
              onChange={(event) =>
                setForm({ ...form, price: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </label>
          <label className="stack">
            <span className="label">Notes</span>
            <textarea value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        {beanCostPerDrink(form as Bean) !== null && (
          <p className="label">≈ {formatMoney(beanCostPerDrink(form as Bean) as number)} per medium-strength drink</p>
        )}
        <div className="card stack sub-card">
          <h4 style={{ margin: 0 }}>Best Espresso Settings</h4>
          <div className="grid two">
            <label className="stack">
              <span className="label">Grind (1-7)</span>
              <input
                type="number"
                min="1"
                max="7"
                value={Number(currentBest.grind_setting || 0)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...currentBest, grind_setting: Number(event.target.value) }
                  })
                }
              />
            </label>
            <label className="stack">
              <span className="label">Coffee Volume ({unit})</span>
              <input
                type="number"
                min="0"
                step={unit === 'oz' ? '0.1' : '1'}
                value={bestVolumeInput}
                onChange={(event) => {
                  setBestVolumeInput(event.target.value);
                  const ml = inputToMl(event.target.value, unit);
                  if (ml === null) return;
                  setForm({
                    ...form,
                    current_best_settings: { ...currentBest, coffee_volume_ml: ml }
                  });
                }}
              />
            </label>
            <label className="stack">
              <span className="label">Strength</span>
              <select
                value={currentBest.strength_level || 'MEDIUM'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...currentBest, strength_level: event.target.value }
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="stack">
              <span className="label">Temperature</span>
              <select
                value={currentBest.temperature_level || 'MEDIUM'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...currentBest, temperature_level: event.target.value }
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
        </div>
      </section>
      <section className="card stack" id="brew-history">
        <div className="inline section-heading">
          <div>
            <h3>Drinks made with {bean.name}</h3>
            <p className="label">{drinks.length} {drinks.length === 1 ? 'drink' : 'drinks'} logged</p>
          </div>
          <label className="sort-control">
            <span className="label">Sort by</span>
            <select value={drinkSort} onChange={(event) => setDrinkSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="rating">Highest rated</option>
              <option value="type">Drink type</option>
            </select>
          </label>
        </div>
        {sortedDrinks.length ? (
          <div className="history-list">
            {sortedDrinks.map((drink) => (
              <Link className="history-item" key={drink.id} to={`/drinks/${drink.id}`}>
                <div>
                  <strong>{drink.custom_label || drink.drink_type}</strong>
                  <span className="label">
                    {new Date(drink.created_at).toLocaleDateString()} · Grind {drink.grind_setting} · {formatVolume(drink.coffee_volume_ml, unit)}
                  </span>
                </div>
                <span className="badge" aria-label={`${drink.overall_rating} out of 5 stars`}>★ {drink.overall_rating}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No drinks with this bean yet.</strong>
            <span className="label">Your next brew will appear here automatically.</span>
            <Link to="/">Log a drink</Link>
          </div>
        )}
      </section>
      <section className="grid two">
        <div className="card">
          <h3>Recommended Settings</h3>
          <p className="label">Considered drinks: {recommended?.total_considered ?? 0}</p>
          {recommended?.recommended ? (
            <p className="label">
              Grind {String(recommended.recommended.grind_setting ?? '-')} ·{' '}
              {formatVolume(Number(recommended.recommended.coffee_volume_ml || 0), unit)} ·{' '}
              {String(recommended.recommended.temperature_level || '-')}
            </p>
          ) : (
            <p className="label">Log a few drinks rated 4+ to unlock recommendations.</p>
          )}
        </div>
        <div className="card">
          <h3>Highest Rated Brew</h3>
          {recommended?.highest_rated ? (
            <p className="label">
              Grind {String(recommended.highest_rated.grind_setting ?? '-')} ·{' '}
              {formatVolume(Number(recommended.highest_rated.coffee_volume_ml || 0), unit)} · Rating{' '}
              {String(recommended.highest_rated.overall_rating ?? '-')}
            </p>
          ) : (
            <p className="label">No standout brew yet.</p>
          )}
        </div>
      </section>
      <section className="grid two">
        <div className="card" style={{ height: 260 }}>
          <h3>Overall Rating vs Grind</h3>
          <ResponsiveContainer width="100%" height="80%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Grind" />
              <YAxis dataKey="y" name="Rating" domain={[0, 5]} />
              <Tooltip />
              <Scatter data={analytics?.rating_vs_grind || []} fill="#9c6b4f" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 260 }}>
          <h3>Overall Rating vs Coffee Volume</h3>
          <ResponsiveContainer width="100%" height="80%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Coffee Volume" />
              <YAxis dataKey="y" name="Rating" domain={[0, 5]} />
              <Tooltip />
              <Scatter data={analytics?.rating_vs_coffee_volume || []} fill="#9c6b4f" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 260 }}>
          <h3>Rating by Temperature</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={analytics?.rating_by_temperature || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temperature_level" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average_rating" fill="#9c6b4f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 260 }}>
          <h3>Average Rating Over Time</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={analytics?.rating_timeline || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="average_rating" stroke="#9c6b4f" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card" style={{ height: 320 }}>
        <h3>Flavor Radar</h3>
        <ResponsiveContainer width="100%" height="80%">
          <RadarChart data={analytics?.radar || []}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis domain={[0, 5]} />
            <Radar name="Average" dataKey="average" stroke="#9c6b4f" fill="#9c6b4f" fillOpacity={0.4} />
            <Radar
              name="Top Rated"
              dataKey="top_rated_average"
              stroke="#f0c9a2"
              fill="#f0c9a2"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
