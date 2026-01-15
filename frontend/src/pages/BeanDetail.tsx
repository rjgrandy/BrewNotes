import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { Bean, BeanAnalytics, RecommendedSettings } from '../utils/types';
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

  useEffect(() => {
    if (!beanId) return;
    const load = async () => {
      const beanRes = await apiGet<Bean>(`/api/beans/${beanId}`);
      const analyticsRes = await apiGet<BeanAnalytics>(`/api/beans/${beanId}/analytics`);
      const recRes = await apiGet<RecommendedSettings>(`/api/beans/${beanId}/recommended-settings`);
      setBean(beanRes);
      setForm(beanRes);
      setAnalytics(analyticsRes);
      setRecommended(recRes);
    };
    load();
  }, [beanId]);

  const handleUpdate = async () => {
    if (!beanId) return;
    const updated = await apiSend<Bean>(`/api/beans/${beanId}`, 'PUT', form);
    setBean(updated);
    setForm(updated);
  };

  const handleArchive = async (archive: boolean) => {
    if (!beanId) return;
    const updated = await apiSend<Bean>(`/api/beans/${beanId}/${archive ? 'archive' : 'unarchive'}`, 'POST');
    setBean(updated);
  };

  const handleUpload = async (file: File) => {
    if (!beanId) return;
    const updated = await uploadFile<Bean>(`/api/beans/${beanId}/photo`, file);
    setBean(updated);
  };

  if (!bean) {
    return <div className="card">Loading...</div>;
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
        <div className="grid two">
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
            <span className="label">Notes</span>
            <textarea value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <label className="stack">
          <span className="label">Bean Photo</span>
          <input type="file" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])} />
        </label>
      </section>
      <section className="grid two">
        <div className="card">
          <h3>Recommended Settings</h3>
          <p className="label">Considered drinks: {recommended?.total_considered ?? 0}</p>
          <pre>{JSON.stringify(recommended?.recommended, null, 2)}</pre>
        </div>
        <div className="card">
          <h3>Highest Rated Brew</h3>
          <pre>{JSON.stringify(recommended?.highest_rated, null, 2)}</pre>
        </div>
      </section>
      <section className="grid two">
        <div className="card" style={{ height: 260 }}>
          <h3>Overall Rating vs Grind</h3>
          <ResponsiveContainer width="100%" height="80%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Grind" />
              <YAxis dataKey="y" name="Rating" />
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
              <YAxis dataKey="y" name="Rating" />
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
              <YAxis />
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
              <YAxis />
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
            <PolarRadiusAxis />
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
