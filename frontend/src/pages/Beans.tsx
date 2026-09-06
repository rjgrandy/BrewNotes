import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { apiSend } from '../utils/api';
import { recipeForType } from '../utils/beanApi';
import { Bean, DrinkLog } from '../utils/types';
import { averageRating } from '../utils/history';
import { useAction, useResource } from '../utils/useResource';
import LoadState from '../components/LoadState';
import { mediaUrl } from '../utils/media';
import { recipeSummaryText } from '../components/RecipeSummary';
import StarsDisplay from '../components/StarsDisplay';
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
type Sort = 'updated' | 'name' | 'rating';

export default function Beans({ unit }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [form, setForm] = useState(emptyBean);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<Sort>('updated');
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(params.get('add') === 'true');
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const coffees = useResource<Bean[]>('/api/beans?include_archived=true');
  const logs = useResource<DrinkLog[]>('/api/drinks');
  const toast = useToast();

  useEffect(() => {
    setBeans(coffees.data ?? []);
  }, [coffees.data]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast('Bean needs a name', 'error');
      return;
    }
    const created = await apiSend<Bean>('/api/beans', 'POST', {
      ...form,
      name: form.name.trim(),
      bag_size_g: form.bag_size_g ? Number(form.bag_size_g) : null,
      price: form.price ? Number(form.price) : null
    });
    setBeans((prev) => [...prev, created]);
    setForm(emptyBean);
    setCreateOpen(false);
    toast('Bean added', 'success');
    navigate(`/beans/${created.id}?tab=overview`);
  };

  const filtered = useMemo(() => {
    const sorters: Record<Sort, (a: Bean, b: Bean) => number> = {
      updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
      name: (a, b) => a.name.localeCompare(b.name),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.updated_at.localeCompare(a.updated_at)
    };
    return beans
      .filter((bean) => (showArchived ? true : !bean.archived))
      .filter((bean) => {
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return [bean.name, bean.roaster, bean.origin, bean.process, bean.tasting_notes, bean.notes]
          .filter(Boolean)
          .some((item) => item?.toLowerCase().includes(query));
      })
      .sort(sorters[sort]);
  }, [beans, search, showArchived, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The coffee collection</p>
          <h1>It starts with the beans.</h1>
          <p>Your coffees, favorite recipes, and the cups they’ve inspired.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={18} /> Add bean
        </button>
      </div>

      <div className="flex flex-wrap gap-2"><span className="badge">{beans.filter(b => !b.archived).length} active coffees</span><span className="badge">{beans.filter(b => b.archived).length} archived</span></div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search beans"
            className="input pl-9"
            placeholder="Search name, roaster, origin, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select aria-label="Sort beans" className="input sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="updated">Recently updated</option>
          <option value="rating">Highest rated</option>
          <option value="name">Name A–Z</option>
        </select>
        <label className="flex items-center justify-between gap-3 sm:justify-start">
          <span className="text-sm font-semibold text-muted">Show archived</span>
          <Switch ariaLabel="Show archived beans" checked={showArchived} onCheckedChange={setShowArchived} />
        </label>
      </div>

      <LoadState loading={coffees.loading} error={coffees.error} retry={coffees.retry} />
      {!coffees.loading && !coffees.error && (filtered.length === 0 ? (
        <div className="card empty-state"><h2>{beans.length ? 'No coffees found' : 'Meet your next favorite coffee.'}</h2><p>{beans.length ? 'Try a different search or include archived beans.' : 'Add a bag, save its photo, and keep every brew together.'}</p>{beans.length ? <button className="btn" onClick={() => { setSearch(''); setShowArchived(true); }}>Show all beans</button> : <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Add your first bean</button>}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bean) => {
            const cover = mediaUrl(bean.thumbnail_path) || mediaUrl(bean.image_path);
            const recipes = bean.recipes ?? [];
            const espresso = recipeForType(bean, 'Espresso');
            const brews = (logs.data ?? []).filter(d => d.bean_id === bean.id);
            return (
              <Link
                key={bean.id}
                to={`/beans/${bean.id}`}
                className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
              >
                {cover && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                    <img
                      src={cover}
                      alt={bean.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute right-2 top-2 flex gap-1.5">
                      {bean.decaf && <span className="badge">Decaf</span>}
                      {bean.archived && <span className="badge">Archived</span>}
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold leading-tight">{bean.name}</h3>
                      <p className="text-xs text-muted">
                        {[bean.roaster, bean.origin].filter(Boolean).join(' · ') || 'No roaster set'}
                      </p>
                      {bean.rating ? <StarsDisplay value={bean.rating} className="mt-1 inline-block" /> : null}
                    </div>
                    {!cover && (
                      <div className="flex shrink-0 gap-1.5">
                        {bean.decaf && <span className="badge">Decaf</span>}
                        {bean.archived && <span className="badge">Archived</span>}
                      </div>
                    )}
                  </div>
                  {espresso && (
                    <p className="text-xs">
                      <span className="font-semibold text-accent">Espresso</span>{' '}
                      <span className="text-muted">{recipeSummaryText(espresso, unit)}</span>
                    </p>
                  )}
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
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs"><span className="text-muted">{logs.data ? `${brews.length} brews${brews.length ? ` · ${averageRating(brews).toFixed(1)} avg` : ''}` : 'Brewing journal'}</span><span className="font-semibold text-accent">View brews →</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      ))}

      <Dialog open={createOpen} onOpenChange={open => { if (!busy) { setCreateOpen(open); if (!open && params.has('add')) setParams({}); } }}>
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
            <button className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={() => run(handleCreate)}>
              {busy ? 'Saving…' : 'Save bean & add photos'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
