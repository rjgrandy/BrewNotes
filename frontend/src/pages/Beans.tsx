import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { Bean } from '../utils/types';
import { formatVolume, inputToMl, volumeToInput } from '../utils/units';
import ImageEditor from '../components/ImageEditor';

const emptyBean = {
  name: '',
  roaster: '',
  origin: '',
  process: '',
  roast_level: '',
  tasting_notes: '',
  roast_date: '',
  open_date: '',
  bag_size_g: '',
  price: '',
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
  const [bestVolumeInput, setBestVolumeInput] = useState(volumeToInput(36, unit));
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<Bean[]>('/api/beans?include_archived=true')
      .then(setBeans)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load beans'));
  }, []);

  useEffect(() => {
    setBestVolumeInput(volumeToInput(form.current_best_settings.coffee_volume_ml, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  useEffect(() => {
    if (!pendingPhoto) {
      setPendingPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPendingPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  const handleCreate = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      let created = await apiSend<Bean>('/api/beans', 'POST', {
        ...form,
        name: form.name.trim(),
        bag_size_g: form.bag_size_g === '' ? null : Number(form.bag_size_g),
        price: form.price === '' ? null : Number(form.price),
        roast_date: form.roast_date || null,
        open_date: form.open_date || null,
        current_best_settings: form.current_best_settings?.grind_setting ? form.current_best_settings : null
      });
      if (pendingPhoto) {
        created = await uploadFile<Bean>(`/api/beans/${created.id}/photo`, pendingPhoto);
      }
      setBeans((prev) => [created, ...prev]);
      setForm(emptyBean);
      setPendingPhoto(null);
      setBestVolumeInput(volumeToInput(emptyBean.current_best_settings.coffee_volume_ml, unit));
      setMessage('Bean saved!');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save bean');
    } finally {
      setSaving(false);
    }
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
            <button className={view === 'cards' ? 'chip active' : 'chip'} onClick={() => setView('cards')}>
              Cards
            </button>
            <button className={view === 'table' ? 'chip active' : 'chip'} onClick={() => setView('table')}>
              Table
            </button>
          </div>
        </div>
        <p className="label">Add bean details once, then save the best espresso settings so every new dial-in starts strong.</p>
        <div className="grid two">
          <label className="stack">
            <span className="label">Name *</span>
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
            <span className="label">Roast Date</span>
            <input type="date" value={form.roast_date} onChange={(event) => setForm({ ...form, roast_date: event.target.value })} />
          </label>
          <label className="stack">
            <span className="label">Bag Size (g)</span>
            <input
              type="number"
              min="0"
              value={form.bag_size_g}
              onChange={(event) => setForm({ ...form, bag_size_g: event.target.value })}
            />
          </label>
          <label className="stack">
            <span className="label">Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>
          <label className="stack">
            <span className="label">Tasting Notes</span>
            <input
              placeholder="e.g. chocolate, cherry, caramel"
              value={form.tasting_notes}
              onChange={(event) => setForm({ ...form, tasting_notes: event.target.value })}
            />
          </label>
          <label className="stack">
            <span className="label">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <div className="stack photo-field">
          <span className="label">Bean Photo</span>
          <div className="inline" style={{ alignItems: 'center' }}>
            {pendingPhotoUrl ? (
              <img className="photo-preview" src={pendingPhotoUrl} alt="New bean" />
            ) : (
              <div className="photo-preview photo-placeholder" aria-hidden="true">
                ☕
              </div>
            )}
            <button type="button" onClick={() => photoInputRef.current?.click()}>
              {pendingPhoto ? 'Change Photo' : 'Add Photo'}
            </button>
            {pendingPhoto && (
              <button type="button" onClick={() => setPendingPhoto(null)}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPendingPhotoFile(file);
              event.target.value = '';
            }}
          />
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
                value={bestVolumeInput}
                onChange={(event) => {
                  setBestVolumeInput(event.target.value);
                  const ml = inputToMl(event.target.value, unit);
                  if (ml === null) return;
                  setForm({
                    ...form,
                    current_best_settings: { ...form.current_best_settings, coffee_volume_ml: ml }
                  });
                }}
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
        <button className="primary" onClick={handleCreate} disabled={!form.name.trim() || saving}>
          {saving ? 'Saving…' : 'Save Bean'}
        </button>
        {message && <span className="label">{message}</span>}
        {error && <span className="label error-text">{error}</span>}
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
            <div key={bean.id} className="card bean-card">
              {bean.thumbnail_path && <img className="bean-card-photo" src={bean.thumbnail_path} alt={bean.name} />}
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <h3>{bean.name}</h3>
                {bean.archived && <span className="badge">Archived</span>}
              </div>
              <p className="label">{bean.roaster || 'Unknown roaster'}</p>
              <p>{bean.notes || bean.tasting_notes || 'No notes yet.'}</p>
              {bean.current_best_settings && (
                <p className="label">
                  Best espresso: Grind {String(bean.current_best_settings.grind_setting || '-')} ·{' '}
                  {formatVolume(Number(bean.current_best_settings.coffee_volume_ml || 0), unit)}
                </p>
              )}
              <Link to={`/beans/${bean.id}`}>View</Link>
            </div>
          ))}
        </section>
      ) : (
        <section className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th align="left">Photo</th>
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
                    {bean.thumbnail_path ? (
                      <img className="table-photo" src={bean.thumbnail_path} alt={bean.name} />
                    ) : (
                      <span className="label">—</span>
                    )}
                  </td>
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
      {pendingPhotoFile && (
        <ImageEditor
          file={pendingPhotoFile}
          title="Edit Bean Photo"
          onSave={(blob) => {
            setPendingPhoto(blob);
            setPendingPhotoFile(null);
          }}
          onCancel={() => setPendingPhotoFile(null)}
        />
      )}
    </div>
  );
}
