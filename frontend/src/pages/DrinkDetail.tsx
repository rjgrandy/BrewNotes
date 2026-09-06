import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, BookmarkPlus } from 'lucide-react';
import { apiSend, uploadFile } from '../utils/api';
import { upsertRecipe } from '../utils/beanApi';
import { Bean, DrinkLog, RecipeSettings } from '../utils/types';
import { DRINK_TYPES } from '../utils/constants';
import { mediaUrl } from '../utils/media';
import { beanLabel, drinkDate } from '../utils/history';
import { useAction, useResource } from '../utils/useResource';
import PhotoPicker from '../components/PhotoPicker';
import LoadState from '../components/LoadState';
import ChipSelect from '../components/ChipSelect';
import RecipeControls from '../components/RecipeControls';
import RatingPanel from '../components/RatingPanel';
import { useToast } from '../components/ui/Toast';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../components/ui/Dialog';

const extractSettings = (drink: DrinkLog): RecipeSettings => ({
  temperature_level: drink.temperature_level,
  body_level: drink.body_level,
  order: drink.order,
  coffee_volume_ml: drink.coffee_volume_ml,
  milk_volume_ml: drink.milk_volume_ml,
  strength_level: drink.strength_level,
  grind_setting: drink.grind_setting
});

export default function DrinkDetail({ unit }: { unit: string }) {
  const { drinkId } = useParams();
  const navigate = useNavigate();
  const [drink, setDrink] = useState<DrinkLog | null>(null);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();
  const { busy, run } = useAction();
  const log = useResource<DrinkLog>(`/api/drinks/${drinkId}`);
  const coffees = useResource<Bean[]>('/api/beans?include_archived=true');
  const [saved, setSaved] = useState<DrinkLog | null>(null);

  useEffect(() => {
    setDrink(log.data ?? null); setSaved(log.data ?? null);
  }, [log.data]);
  useEffect(() => { setBeans(coffees.data ?? []); }, [coffees.data]);

  if (!drink) return <LoadState loading={log.loading} error={log.error} retry={log.retry} />;
  const dirty = JSON.stringify(drink) !== JSON.stringify(saved);

  const patch = (next: Partial<DrinkLog>) => setDrink((d) => (d ? { ...d, ...next } : d));

  const handleSave = async () => {
    const updated = await apiSend<DrinkLog>(`/api/drinks/${drinkId}`, 'PUT', drink);
    setDrink(updated);
    setSaved(updated);
    toast('Changes saved', 'success');
  };

  const handleDelete = async () => {
    await apiSend(`/api/drinks/${drinkId}`, 'DELETE');
    navigate('/drinks');
  };

  const handleUpload = async (file?: File) => {
    if (!file || !drinkId) return;
    const updated = await uploadFile<DrinkLog>(`/api/drinks/${drinkId}/photo`, file);
    const photoFields = { photo_path: updated.photo_path, thumbnail_path: updated.thumbnail_path };
    patch(photoFields);
    setSaved(prev => prev ? { ...prev, ...photoFields } : prev);
    toast('Photo added', 'success');
  };

  const promoteToRecipe = async () => {
    await upsertRecipe(drink.bean_id, drink.drink_type, extractSettings(drink), 'from_drink', drink.id);
    toast(`Saved as ${drink.drink_type} recipe`, 'success');
  };

  const photo = mediaUrl(drink.photo_path);

  return (
    <div className="flex flex-col gap-5">
      <Link to="/drinks?view=history" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} /> All drinks
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Brew details</p>
          <h1 className="text-3xl font-bold tracking-tight">{drink.custom_label || drink.drink_type}</h1>
          <p className="text-sm text-muted">{drinkDate(drink.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-primary" disabled={busy || !dirty} onClick={() => run(handleSave)}>
            {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <LoadState error={coffees.error} retry={coffees.retry} />
      <div className="journal-hero flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">The bean behind this cup</p><Link className="text-lg font-bold hover:text-accent" to={`/beans/${drink.bean_id}`}>{beanLabel(beans.find(b => b.id === drink.bean_id))} →</Link><p className="mt-1 text-sm text-muted">Open the bean to see its recipes and every brew.</p></div><div className="flex flex-wrap gap-2"><Link className="btn" to={`/drinks/type/${encodeURIComponent(drink.drink_type)}`}>Compare beans for {drink.drink_type}</Link><Link className="btn btn-primary" to={`/?repeat=${drink.id}`}>Brew again</Link></div></div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card flex flex-col gap-5 p-5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Bean</span>
              <select className="input" value={drink.bean_id} onChange={(e) => patch({ bean_id: e.target.value })}>
                {beans.map((bean) => (
                  <option key={bean.id} value={bean.id}>
                    {bean.roaster ? `${bean.roaster} — ${bean.name}` : bean.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Made by</span>
              <input className="input" value={drink.made_by || ''} onChange={(e) => patch({ made_by: e.target.value })} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5"><span className="field-label">Drink name (optional)</span><input className="input" placeholder="e.g. Sunday morning cortado" value={drink.custom_label || ''} onChange={e => patch({ custom_label: e.target.value })} /></label>

          <div className="flex flex-col gap-1.5">
            <span className="field-label">Drink type</span>
            <ChipSelect
              ariaLabel="Drink type"
              options={DRINK_TYPES}
              value={drink.drink_type}
              onChange={(drink_type) => patch({ drink_type })}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="section-title">Recipe</span>
              <button className="btn !min-h-0 px-3 py-1.5 text-xs" disabled={busy} onClick={() => run(promoteToRecipe)}>
                <BookmarkPlus size={15} /> Save as bean recipe
              </button>
            </div>
            <RecipeControls value={drink} onChange={patch} unit={unit} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <span className="section-title">Rating</span>
            <RatingPanel value={drink} onChange={patch} />
            <label className="flex flex-col gap-1.5"><span className="field-label">Rated by</span><input className="input" value={drink.rated_by || ''} onChange={e => patch({ rated_by: e.target.value })} /></label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Notes</span>
            <textarea className="input" value={drink.notes || ''} onChange={(e) => patch({ notes: e.target.value })} />
          </label>
        </section>

        <aside className="card flex h-fit flex-col gap-3 p-5">
          <h3 className="section-title">Photo</h3>
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface-muted">
            {photo ? (
              <img src={photo} alt={drink.drink_type} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted">No photo yet</div>
            )}
          </div>
          <PhotoPicker currentPhoto={photo} onSave={handleUpload} />
          <p className="text-xs text-muted">Crop and rotate before saving. Photo changes save separately from your brew details.</p>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-bold">Delete this drink?</DialogTitle>
          <p className="mt-2 text-sm text-muted">This permanently removes the log and its photo.</p>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <button className="btn">Cancel</button>
            </DialogClose>
            <button className="btn btn-danger" disabled={busy} onClick={() => run(handleDelete)}>
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
