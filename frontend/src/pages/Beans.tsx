import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiSend } from '../utils/api';
import { Bean } from '../utils/types';

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
  notes: ''
};

type Props = { unit: string };

export default function Beans({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [form, setForm] = useState(emptyBean);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    apiGet<Bean[]>('/api/beans?include_archived=true').then(setBeans);
  }, []);

  const handleCreate = async () => {
    const created = await apiSend<Bean>('/api/beans', 'POST', {
      ...form,
      bag_size_g: form.bag_size_g || null,
      price: form.price || null,
      roast_date: form.roast_date || null,
      open_date: form.open_date || null
    });
    setBeans((prev) => [...prev, created]);
    setForm(emptyBean);
  };

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
        <button className="primary" onClick={handleCreate}>
          Save Bean
        </button>
      </section>
      {view === 'cards' ? (
        <section className="grid three">
          {beans.map((bean) => (
            <div key={bean.id} className="card">
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <h3>{bean.name}</h3>
                {bean.archived && <span className="badge">Archived</span>}
              </div>
              <p className="label">{bean.roaster || 'Unknown roaster'}</p>
              <p>{bean.notes || 'No notes yet.'}</p>
              <Link to={`/beans/${bean.id}`}>View</Link>
            </div>
          ))}
        </section>
      ) : (
        <section className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Roaster</th>
                <th align="left">Origin</th>
                <th align="left">Status</th>
              </tr>
            </thead>
            <tbody>
              {beans.map((bean) => (
                <tr key={bean.id}>
                  <td>
                    <Link to={`/beans/${bean.id}`}>{bean.name}</Link>
                  </td>
                  <td>{bean.roaster}</td>
                  <td>{bean.origin}</td>
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
