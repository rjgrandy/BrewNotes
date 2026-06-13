import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, BookmarkPlus, Upload } from 'lucide-react';
import { apiGet, apiSend, uploadFile } from '../utils/api';
import { upsertRecipe } from '../utils/beanApi';
import { Bean, DrinkLog, RecipeSettings } from '../utils/types';
import { DRINK_TYPES } from '../utils/constants';
import { mediaUrl } from '../utils/media';
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

  useEffect(() => {
    if (!drinkId) return;
    apiGet<DrinkLog>(`/api/drinks/${drinkId}`).then(setDrink);
    apiGet<Bean[]>('/api/beans?include_archived=true').then(setBeans);
  }, [drinkId]);

  if (!drink) return <div className="card p-6 text-muted">Loading…</div>;

  const patch = (next: Partial<DrinkLog>) => setDrink((d) => (d ? { ...d, ...next } : d));

  const handleSave = async () => {
    const updated = await apiSend<DrinkLog>(`/api/drinks/${drinkId}`, 'PUT', drink);
    setDrink(updated);
    toast('Changes saved', 'success');
  };

  const handleDelete = async () => {
    await apiSend(`/api/drinks/${drinkId}`, 'DELETE');
    navigate('/drinks');
  };

  const handleUpload = async (file?: File) => {
    if (!file || !drinkId) return;
    setDrink(await uploadFile<DrinkLog>(`/api/drinks/${drinkId}/photo`, file));
    toast('Photo added', 'success');
  };

  const promoteToRecipe = async () => {
    await upsertRecipe(drink.bean_id, drink.drink_type, extractSettings(drink), 'from_drink', drink.id);
    toast(`Saved as ${drink.drink_type} recipe`, 'success');
  };

  const photo = mediaUrl(drink.photo_path);

  return (
    <div className="flex flex-col gap-5">
      <Link to="/drinks" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} /> All drinks
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{drink.drink_type}</h1>
          <p className="text-sm text-muted">{new Date(drink.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

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
              <button className="btn !min-h-0 px-3 py-1.5 text-xs" onClick={promoteToRecipe}>
                <BookmarkPlus size={15} /> Save as bean recipe
              </button>
            </div>
            <RecipeControls value={drink} onChange={patch} unit={unit} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <span className="section-title">Rating</span>
            <RatingPanel value={drink} onChange={patch} />
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
          <label className="btn cursor-pointer justify-center">
            <Upload size={16} /> {photo ? 'Replace photo' : 'Add photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </label>
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
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
