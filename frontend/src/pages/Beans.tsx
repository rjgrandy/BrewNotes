import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Coffee } from 'lucide-react';
import { apiGet, apiSend } from '../utils/api';
import { Bean } from '../utils/types';
import { mediaUrl } from '../utils/media';
import { useToast } from '../components/ui/Toast';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';

const emptyBean = {
  name: '',
  roaster: '',
  origin: '',
  process: '',
  roast_level: '',
  tasting_notes: '',
  bag_size_g: '',
  price: '',
  decaf: false,
  notes: ''
};

type Props = { unit: string };

export default function Beans(_props: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [form, setForm] = useState(emptyBean);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiGet<Bean[]>('/api/beans?include_archived=true').then(setBeans);
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast('Bean needs a name', 'error');
      return;
    }
    const created = await apiSend<Bean>('/api/beans', 'POST', {
      ...form,
      bag_size_g: form.bag_size_g ? Number(form.bag_size_g) : null,
      price: form.price ? Number(form.price) : null
    });
    setBeans((prev) => [...prev, created]);
    setForm(emptyBean);
    setCreateOpen(false);
    toast('Bean added', 'success');
  };

  const filtered = useMemo(
    () =>
      beans
        .filter((bean) => (showArchived ? true : !bean.archived))
        .filter((bean) => {
          if (!search.trim()) return true;
          const query = search.toLowerCase();
          return [bean.name, bean.roaster, bean.origin, bean.process, bean.tasting_notes, bean.notes]
            .filter(Boolean)
            .some((item) => item?.toLowerCase().includes(query));
        })
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [beans, search, showArchived]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Beans</h1>
          <p className="text-sm text-muted">Your roster of coffees and their best recipes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={18} /> Add bean
        </button>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search name, roaster, origin, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 sm:justify-start">
          <span className="text-sm font-semibold text-muted">Show archived</span>
          <Switch ariaLabel="Show archived beans" checked={showArchived} onCheckedChange={setShowArchived} />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-muted">No beans match your search.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bean) => {
            const cover = mediaUrl(bean.thumbnail_path) || mediaUrl(bean.image_path);
            const recipes = bean.recipes ?? [];
            return (
              <Link
                key={bean.id}
                to={`/beans/${bean.id}`}
                className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={bean.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted">
                      <Coffee size={40} strokeWidth={1.4} />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    {bean.decaf && <span className="badge">Decaf</span>}
                    {bean.archived && <span className="badge">Archived</span>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div>
                    <h3 className="font-bold leading-tight">{bean.name}</h3>
                    <p className="text-xs text-muted">
                      {[bean.roaster, bean.origin].filter(Boolean).join(' · ') || 'No roaster set'}
                    </p>
                  </div>
                  {recipes.length > 0 ? (
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {recipes.slice(0, 3).map((recipe) => (
                        <span key={recipe.id} className="badge">
                          {recipe.drink_type}
                        </span>
                      ))}
                      {recipes.length > 3 && <span className="badge">+{recipes.length - 3}</span>}
                    </div>
                  ) : (
                    <p className="mt-auto text-xs text-muted">No saved recipes yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogTitle className="mb-1 text-lg font-bold">Add a bean</DialogTitle>
          <p className="mb-4 text-sm text-muted">Capture the essentials — dial in recipes from the bean page.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="field-label">Name *</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            {(
              [
                ['Roaster', 'roaster'],
                ['Origin', 'origin'],
                ['Process', 'process'],
                ['Roast level', 'roast_level']
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="field-label">{label}</span>
                <input
                  className="input"
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Bag size (g)</span>
              <input
                className="input"
                type="number"
                value={form.bag_size_g}
                onChange={(e) => setForm({ ...form, bag_size_g: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Price</span>
              <input
                className="input"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="field-label">Tasting notes</span>
              <input
                className="input"
                value={form.tasting_notes}
                onChange={(e) => setForm({ ...form, tasting_notes: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="field-label">Notes</span>
              <textarea className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <label className="flex items-center justify-between gap-3 sm:col-span-2">
              <span className="text-sm font-semibold">Decaf</span>
              <Switch ariaLabel="Decaf" checked={form.decaf} onCheckedChange={(decaf) => setForm({ ...form, decaf })} />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <button className="btn">Cancel</button>
            </DialogClose>
            <button className="btn btn-primary" onClick={handleCreate}>
              Save bean
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
