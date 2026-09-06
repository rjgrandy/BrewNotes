import { useEffect, useMemo, useState, ReactElement } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Star, Trash2, Wand2 } from 'lucide-react';
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
  Line
} from 'recharts';
import { apiGet, apiSend } from '../utils/api';
import { upsertRecipe, deleteRecipe, uploadBeanPhoto, deleteBeanPhoto, setBeanCover, recipeForType } from '../utils/beanApi';
import { Bean, BeanAnalytics, DrinkLog, RecipeSettings, RecommendedSettings } from '../utils/types';
import { replaceBeanPhoto } from '../utils/beanApi';
import { useResource, useAction } from '../utils/useResource';
import { averageRating } from '../utils/history';
import DrinkHistory from '../components/DrinkHistory';
import PhotoPicker from '../components/PhotoPicker';
import LoadState from '../components/LoadState';
import { DEFAULT_SETTINGS, DRINK_TYPES } from '../utils/constants';
import { formatVolume } from '../utils/units';
import { mediaUrl } from '../utils/media';
import ChipSelect from '../components/ChipSelect';
import RecipeControls from '../components/RecipeControls';
import RecipeSummary from '../components/RecipeSummary';
import StarRating from '../components/StarRating';
import { useToast } from '../components/ui/Toast';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';
import { cn } from '../components/ui/cn';

type Props = { unit: string };
type Tab = 'drinks' | 'overview' | 'recipes' | 'analytics';

const CHART_COLOR = 'var(--accent)';

export default function BeanDetail({ unit }: Props) {
  const { beanId } = useParams();
  const [bean, setBean] = useState<Bean | null>(null);
  const [analytics, setAnalytics] = useState<BeanAnalytics | null>(null);
  const [params, setParams] = useSearchParams();
  const tab = (['drinks', 'overview', 'recipes', 'analytics'].includes(params.get('tab') || '') ? params.get('tab') : 'drinks') as Tab;
  const setTab = (value: Tab) => setParams(prev => { const next = new URLSearchParams(prev); next.set('tab', value); return next; });
  const logs = useResource<DrinkLog[]>(`/api/drinks?bean_id=${beanId}`);
  const [error, setError] = useState('');
  const [photoToDelete, setPhotoToDelete] = useState<string>();
  const { busy, run } = useAction();
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [recipeType, setRecipeType] = useState(DRINK_TYPES[0]);
  const [recipeDraft, setRecipeDraft] = useState<RecipeSettings>(DEFAULT_SETTINGS);
  const [recommended, setRecommended] = useState<RecommendedSettings | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const toast = useToast();

  const loadBean = async () => {
    if (!beanId) return;
    const beanRes = await apiGet<Bean>(`/api/beans/${beanId}`);
    setBean(beanRes);
    setMeta({
      name: beanRes.name,
      roaster: beanRes.roaster ?? '',
      origin: beanRes.origin ?? '',
      process: beanRes.process ?? '',
      roast_level: beanRes.roast_level ?? '',
      roast_date: beanRes.roast_date ?? '',
      open_date: beanRes.open_date ?? '',
      bag_size_g: beanRes.bag_size_g ?? '',
      price: beanRes.price ?? '',
      decaf: beanRes.decaf,
      tasting_notes: beanRes.tasting_notes ?? '',
      notes: beanRes.notes ?? ''
    });
  };

  useEffect(() => {
    if (!beanId) return;
    setBean(null); setError('');
    loadBean().catch(err => setError(err.message));
    apiGet<BeanAnalytics>(`/api/beans/${beanId}/analytics`).then(setAnalytics).catch(() => setAnalytics(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beanId]);

  // Load the draft + recommendation for the selected drink type.
  useEffect(() => {
    if (!bean) return;
    let active = true;
    setRecommended(null);
    setRecipeDraft(recipeForType(bean, recipeType) ?? DEFAULT_SETTINGS);
    if (beanId) {
      apiGet<RecommendedSettings>(
        `/api/beans/${beanId}/recommended-settings?drink_type=${encodeURIComponent(recipeType)}`
      ).then(value => { if (active) setRecommended(value); }).catch(() => { if (active) setRecommended(null); });
    }
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeType, bean?.id]);

  const savedRecipe = useMemo(() => recipeForType(bean ?? undefined, recipeType), [bean, recipeType]);

  if (!bean) return <LoadState loading={!error} error={error} retry={() => { setError(''); loadBean().catch(err => setError(err.message)); }} />;

  const photos = bean.photos ?? [];
  const cover = mediaUrl(bean.image_path);
  const espresso = recipeForType(bean, 'Espresso');

  const saveMeta = async () => {
    if (!String(meta.name || '').trim()) throw new Error('Give this bean a name before saving.');
    const payload = {
      ...meta,
      name: String(meta.name).trim(),
      bag_size_g: meta.bag_size_g ? Number(meta.bag_size_g) : null,
      price: meta.price ? Number(meta.price) : null,
      roast_date: meta.roast_date || null,
      open_date: meta.open_date || null
    };
    const updated = await apiSend<Bean>(`/api/beans/${beanId}`, 'PUT', payload);
    setBean((prev) => ({ ...updated, recipes: prev?.recipes, photos: prev?.photos }));
    toast('Bean saved', 'success');
  };

  const toggleArchive = async () => {
    const updated = await apiSend<Bean>(`/api/beans/${beanId}/${bean.archived ? 'unarchive' : 'archive'}`, 'POST');
    setBean((prev) => (prev ? { ...prev, archived: updated.archived } : updated));
    toast(updated.archived ? 'Bean archived' : 'Bean unarchived');
  };

  const saveRating = async (rating: number) => {
    const updated = await apiSend<Bean>(`/api/beans/${beanId}`, 'PUT', { name: bean.name, rating });
    setBean((prev) => (prev ? { ...prev, rating: updated.rating } : updated));
  };

  const headerInner = (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow">{bean.name}</h1>
        <p className="text-sm text-white/85">
          {[bean.roaster, bean.origin].filter(Boolean).join(' · ') || 'No roaster set'}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StarRating label="Bean rating" size={22} value={bean.rating ?? 0} onChange={rating => run(() => saveRating(rating))} />
          <span className="text-xs text-white/70">Rate this bean</span>
        </div>
      </div>
      <div className="flex gap-2">
        {bean.decaf && <span className="badge">Decaf</span>}
        {bean.archived && <span className="badge">Archived</span>}
      </div>
    </div>
  );

  const onUpload = async (file?: File) => {
    if (!file || !beanId) return;
    const updated = await uploadBeanPhoto(beanId, file);
    setBean(updated);
    toast('Photo added', 'success');
  };

  const onSetCover = async (photoId: string) => {
    if (!beanId) return;
    setBean(await setBeanCover(beanId, photoId));
    toast('Cover updated');
  };

  const onDeletePhoto = async (photoId: string) => {
    if (!beanId) return;
    setBean(await deleteBeanPhoto(beanId, photoId));
    setLightbox(null);
    toast('Photo removed');
  };

  const saveRecipe = async () => {
    if (!beanId) return;
    const recipe = await upsertRecipe(beanId, recipeType, recipeDraft);
    setBean((prev) =>
      prev
        ? { ...prev, recipes: [...(prev.recipes ?? []).filter((r) => r.drink_type !== recipeType), recipe] }
        : prev
    );
    toast(`Saved ${recipeType} recipe`, 'success');
  };

  const removeRecipe = async () => {
    if (!beanId) return;
    await deleteRecipe(beanId, recipeType);
    setBean((prev) =>
      prev ? { ...prev, recipes: (prev.recipes ?? []).filter((r) => r.drink_type !== recipeType) } : prev
    );
    setRecipeDraft(DEFAULT_SETTINGS);
    toast(`Removed ${recipeType} recipe`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'drinks', label: 'Brews' },
    { id: 'recipes', label: 'Recipes' },
    { id: 'analytics', label: 'Trends' },
    { id: 'overview', label: 'Details' }
  ];

  const metaFields: [string, string, string?][] = [
    ['Name', 'name'],
    ['Roaster', 'roaster'],
    ['Origin', 'origin'],
    ['Process', 'process'],
    ['Roast level', 'roast_level'],
    ['Roast date', 'roast_date', 'date'],
    ['Open date', 'open_date', 'date'],
    ['Bag size (g)', 'bag_size_g', 'number'],
    ['Price', 'price', 'number']
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link to="/beans" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} /> All beans
      </Link>

      {/* Header */}
      <section className="card overflow-hidden">
        {cover ? (
          <div className="relative aspect-[16/10] min-h-56 w-full bg-surface-muted sm:aspect-[21/9]">
            <img src={cover} alt={bean.name} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10">
              {headerInner}
            </div>
          </div>
        ) : (
          <div
            className="p-5"
            style={{ background: 'linear-gradient(135deg, var(--accent-strong), var(--accent) 65%, var(--gold))' }}
          >
            {headerInner}
          </div>
        )}

        {/* Photo strip */}
        <div className="flex items-center gap-2 overflow-x-auto p-3">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Open photo ${index + 1} of ${bean.name}`}
              onClick={() => setLightbox(photo.id)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border',
                bean.image_path === photo.image_path ? 'border-accent' : 'border-border'
              )}
            >
              <img src={mediaUrl(photo.thumbnail_path)} alt={photo.caption || bean.name} className="h-full w-full object-cover" />
            </button>
          ))}
          <div className="shrink-0"><PhotoPicker onSave={onUpload} /></div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{logs.data ? `${logs.data.length} brews · ${logs.data.length ? averageRating(logs.data).toFixed(1) + ' average rating' : 'Your story starts with the first cup'}` : 'Your recipes, photos, and brewing history.'}</p>
        <Link className="btn btn-primary" to={`/?bean=${bean.id}`}>Brew with this bean</Link>
      </div>
      <div className="segmented w-full sm:max-w-md" aria-label="Bean sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="segmented-item"
            data-active={tab === t.id}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'drinks' && <section><div className="mb-4"><h2 className="text-xl font-bold">Brewed with {bean.name}</h2><p className="text-sm text-muted">Find a favorite, compare your settings, or brew it again.</p></div><LoadState loading={logs.loading} error={logs.error} retry={logs.retry} />{logs.data && <DrinkHistory drinks={logs.data} beans={[bean]} unit={unit} fixedBean={bean.id} />}</section>}

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <section className="card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Optimal espresso</h2>
              <button className="btn !min-h-0 px-3 py-1.5 text-xs" onClick={() => setTab('recipes')}>
                Edit recipes
              </button>
            </div>
            {espresso ? (
              <RecipeSummary settings={espresso} unit={unit} />
            ) : (
              <p className="text-sm text-muted">
                No espresso recipe yet — add one in the Recipes tab and it'll show here and auto-load on the Log screen.
              </p>
            )}
          </section>

          <section className="card flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Details</h2>
            <div className="flex gap-2">
              <button className="btn" disabled={busy} onClick={() => run(toggleArchive)}>
                {bean.archived ? 'Unarchive' : 'Archive'}
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={() => run(saveMeta)}>
                Save
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {metaFields.map(([label, key, type]) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="field-label">{label}</span>
                <input
                  className="input"
                  type={type ?? 'text'}
                  value={String(meta[key] ?? '')}
                  onChange={(e) => setMeta({ ...meta, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="field-label">Tasting notes</span>
              <input
                className="input"
                value={String(meta.tasting_notes ?? '')}
                onChange={(e) => setMeta({ ...meta, tasting_notes: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="field-label">Notes</span>
              <textarea
                className="input"
                value={String(meta.notes ?? '')}
                onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 sm:col-span-2">
              <span className="text-sm font-semibold">Decaf</span>
              <Switch ariaLabel="Decaf" checked={!!meta.decaf} onCheckedChange={(decaf) => setMeta({ ...meta, decaf })} />
            </label>
          </div>
          </section>
        </div>
      )}

      {tab === 'recipes' && (
        <section className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4 p-5">
            <div>
              <h2 className="section-title">Best recipe per drink</h2>
              <p className="text-sm text-muted">Dial each drink type once; the Log screen loads it automatically.</p>
            </div>
            <ChipSelect ariaLabel="Recipe drink type" options={DRINK_TYPES} value={recipeType} onChange={setRecipeType} />
            <RecipeControls value={recipeDraft} onChange={(patch) => setRecipeDraft((d) => ({ ...d, ...patch }))} unit={unit} />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={busy} onClick={() => run(saveRecipe)}>
                Save {recipeType} recipe
              </button>
              {savedRecipe && (
                <button className="btn btn-danger" disabled={busy} onClick={() => run(removeRecipe)}>
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
          </div>

          <div className="card flex flex-col gap-3 p-5">
            <h3 className="section-title flex items-center gap-2">
              <Wand2 size={18} className="text-accent" /> Suggested from your logs
            </h3>
            <p className="text-sm text-muted">
              Based on {recommended?.total_considered ?? 0} highly-rated {recipeType} logs.
            </p>
            {recommended?.recommended ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Grind" value={String(recommended.recommended.grind_setting ?? '–')} />
                  <Stat label="Coffee" value={formatVolume(Number(recommended.recommended.coffee_volume_ml || 0), unit)} />
                  <Stat label="Strength" value={String(recommended.recommended.strength_level ?? '–')} />
                  <Stat label="Temp" value={String(recommended.recommended.temperature_level ?? '–')} />
                </div>
                <button className="btn self-start" onClick={() => setRecipeDraft({ ...recommended.recommended })}>
                  Apply suggestion
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">Not enough 4★+ logs for {recipeType} yet.</p>
            )}
          </div>
        </section>
      )}

      {tab === 'analytics' && !analytics && <LoadState error="Trends could not be loaded." retry={() => run(async () => setAnalytics(await apiGet<BeanAnalytics>(`/api/beans/${beanId}/analytics`)))} />}
      {tab === 'analytics' && analytics && logs.data?.length === 0 && <div className="card empty-state"><h2>A little more brewing, a little more insight.</h2><p>Log a drink to start seeing trends for this bean.</p></div>}
      {tab === 'analytics' && analytics && !!logs.data?.length && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Rating vs grind">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" name="Grind" stroke="var(--muted)" fontSize={12} />
              <YAxis dataKey="y" name="Rating" stroke="var(--muted)" fontSize={12} domain={[0, 5]} />
              <Tooltip />
              <Scatter data={analytics?.rating_vs_grind || []} fill={CHART_COLOR} />
            </ScatterChart>
          </ChartCard>
          <ChartCard title="Rating vs coffee volume">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" name="Volume" stroke="var(--muted)" fontSize={12} />
              <YAxis dataKey="y" name="Rating" stroke="var(--muted)" fontSize={12} domain={[0, 5]} />
              <Tooltip />
              <Scatter data={analytics?.rating_vs_coffee_volume || []} fill={CHART_COLOR} />
            </ScatterChart>
          </ChartCard>
          <ChartCard title="Rating by temperature">
            <BarChart data={analytics?.rating_by_temperature || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="temperature_level" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="average_rating" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Rating over time">
            <LineChart data={analytics?.rating_timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="average_rating" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartCard>
        </section>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        {lightbox &&
          (() => {
            const photo = photos.find((p) => p.id === lightbox);
            if (!photo) return null;
            const isCover = bean.image_path === photo.image_path;
            return (
              <DialogContent wide>
                <DialogTitle className="sr-only">Bean photo</DialogTitle>
                <img
                  src={mediaUrl(photo.image_path)}
                  alt={photo.caption ?? bean.name}
                  className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain"
                />
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <PhotoPicker editOnly currentPhoto={mediaUrl(photo.image_path)} onSave={async file => { setBean(await replaceBeanPhoto(bean.id, photo.id, file)); toast('Photo updated', 'success'); }} />
                  {!isCover && (
                    <button className="btn" disabled={busy} onClick={() => run(() => onSetCover(photo.id))}>
                      <Star size={16} /> Set as cover
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => { setLightbox(null); setPhotoToDelete(photo.id); }}>
                    <Trash2 size={16} /> Delete
                  </button>
                  <DialogClose asChild>
                    <button className="btn">Close</button>
                  </DialogClose>
                </div>
              </DialogContent>
            );
          })()}
      </Dialog>
      <Dialog open={!!photoToDelete} onOpenChange={open => { if (!open && !busy) setPhotoToDelete(undefined); }}><DialogContent><DialogTitle className="text-lg font-bold">Delete this photo?</DialogTitle><p className="mt-2 text-sm text-muted">This removes the photo from your bean gallery. This cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><button className="btn" disabled={busy} onClick={() => setPhotoToDelete(undefined)}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={() => run(async () => { if (photoToDelete) await onDeletePhoto(photoToDelete); setPhotoToDelete(undefined); })}>Delete photo</button></div></DialogContent></Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-muted px-3 py-2">
      <div className="field-label">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ChartCard({ title, children, height = 240 }: { title: string; children: ReactElement; height?: number }) {
  return (
    <div className="card p-4">
      <h3 className="section-title mb-2">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
