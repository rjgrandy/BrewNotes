import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiSend } from '../utils/api';
import { Bean } from '../utils/types';
import { formatVolume, ozToMl } from '../utils/units';
import { imageUrl } from '../utils/images';

const emptyBean = {
  name: '',
  roaster: '',
  origin: '',
  process: '',
  roast_level: '',
  tasting_notes: '',
  roast_date: '',
  open_date: '',
  bag_size_g: 0,
  price: 0,
  decaf: false,
  notes: '',
  current_best_settings: {
    grind_setting: 3,
    coffee_volume_ml: 36,
    strength_level: 'MEDIUM',
    temperature_level: 'MEDIUM'
  }
};

type Props = { unit: string };

export default function Beans({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [form, setForm] = useState(emptyBean);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(true);

  useEffect(() => {
    apiGet<Bean[]>('/api/beans?include_archived=true').then(setBeans);
  }, []);

  const handleCreate = async () => {
    const created = await apiSend<Bean>('/api/beans', 'POST', {
      ...form,
      bag_size_g: form.bag_size_g || null,
      price: form.price || null,
      roast_date: form.roast_date || null,
      open_date: form.open_date || null,
      current_best_settings: form.current_best_settings?.grind_setting ? form.current_best_settings : null
    });
    setBeans((prev) => [...prev, created]);
    setForm(emptyBean);
  };

  const filteredBeans = beans
    .filter((bean) => (showArchived ? true : !bean.archived))
    .filter((bean) => {
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return [bean.name, bean.roaster, bean.origin, bean.process, bean.notes]
        .filter(Boolean)
        .some((item) => item?.toLowerCase().includes(query));
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="stack">
      <section className="card stack">
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>New Bean</h3>
          <div className="inline">
            <button onClick={() => setView('cards')}>Cards</button>
            <button onClick={() => setView('table')}>Table</button>
          </div>
        </div>
        <p className="label">Add bean details once, then save the best espresso settings so every new dial-in starts strong.</p>
        <div className="grid two">
          <label className="stack">
            <span className="label">Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Roaster</span>
            <input value={form.roaster} onChange={(event) => setForm({ ...form, roaster: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Origin</span>
            <input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Process</span>
            <input value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Roast Level</span>
            <input value={form.roast_level} onChange={(event) => setForm({ ...form, roast_level: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Bag Size (g)</span>
            <input
              type="number"
              value={form.bag_size_g}
              onChange={(event) => setForm({ ...form, bag_size_g: Number(event.target.value) })}
            />
          </label>
          <label className="stack">
            <span className="label">Price</span>
            <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} />
          </label>
          <label className="stack">
            <span className="label">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <div className="card stack sub-card">
          <h4 style={{ margin: 0 }}>Best Espresso Settings</h4>
          <div className="grid two">
            <label className="stack">
              <span className="label">Grind (1-7)</span>
              <input
                type="number"
                min="1"
                max="7"
                value={Number(form.current_best_settings.grind_setting || 0)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...form.current_best_settings, grind_setting: Number(event.target.value) }
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
                value={unit === 'oz'
                  ? ((Number(form.current_best_settings.coffee_volume_ml || 0) / 29.5735) || 0).toFixed(1)
                  : Number(form.current_best_settings.coffee_volume_ml || 0)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: {
                      ...form.current_best_settings,
                      coffee_volume_ml: unit === 'oz' ? ozToMl(Number(event.target.value)) : Number(event.target.value)
                    }
                  })
                }
              />
            </label>
            <label className="stack">
              <span className="label">Strength</span>
              <select
                value={String(form.current_best_settings.strength_level || 'MEDIUM')}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...form.current_best_settings, strength_level: event.target.value }
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
                value={String(form.current_best_settings.temperature_level || 'MEDIUM')}
                onChange={(event) =>
                  setForm({
                    ...form,
                    current_best_settings: { ...form.current_best_settings, temperature_level: event.target.value }
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
        <button className="primary" onClick={handleCreate}>
          Save Bean
        </button>
      </section>
      <section className="card stack">
        <div className="grid two">
          <label className="stack">
            <span className="label">Search Beans</span>
            <input
              placeholder="Search by name, roaster, origin, or notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="label">Visibility</span>
            <select value={showArchived ? 'all' : 'active'} onChange={(event) => setShowArchived(event.target.value === 'all')}>
              <option value="all">All Beans</option>
              <option value="active">Active Only</option>
            </select>
          </label>
        </div>
      </section>
      {view === 'cards' ? (
        <section className="grid three">
          {filteredBeans.map((bean) => (
            <div key={bean.id} className="card">
              <Link to={`/beans/${bean.id}`} className="bean-card-photo" aria-label={`Open ${bean.name}`}>
                {bean.thumbnail_path || bean.image_path ? <img src={imageUrl(bean.thumbnail_path || bean.image_path)} alt="" /> : <span aria-hidden="true">☕</span>}
              </Link>
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <h3>{bean.name}</h3>
                {bean.archived && <span className="badge">Archived</span>}
              </div>
              <p className="label">{bean.roaster || 'Unknown roaster'}</p>
              <p>{bean.notes || 'No notes yet.'}</p>
              {bean.current_best_settings && (
                <p className="label">
                  Best espresso: Grind {String(bean.current_best_settings.grind_setting || '-')} ·{' '}
                  {formatVolume(Number(bean.current_best_settings.coffee_volume_ml || 0), unit)}
                </p>
              )}
              <div className="inline card-links"><Link to={`/beans/${bean.id}`}>View bean</Link><Link to={`/drinks?bean=${encodeURIComponent(bean.id)}`}>View drinks</Link></div>
            </div>
          ))}
        </section>
      ) : (
        <section className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Roaster</th>
                <th align="left">Origin</th>
                <th align="left">Best Espresso</th>
                <th align="left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeans.map((bean) => (
                <tr key={bean.id}>
                  <td>
                    <Link to={`/beans/${bean.id}`}>{bean.name}</Link>
                  </td>
                  <td>{bean.roaster}</td>
                  <td>{bean.origin}</td>
                  <td>
                    {bean.current_best_settings
                      ? `G${String(bean.current_best_settings.grind_setting || '-')}, ${formatVolume(Number(bean.current_best_settings.coffee_volume_ml || 0), unit)}`
                      : 'Not set'}
                  </td>
                  <td>{bean.archived ? 'Archived' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
