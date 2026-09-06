import { Link } from 'react-router-dom';
import { ArrowUpRight, RotateCcw, Star } from 'lucide-react';
import { Bean, DrinkLog } from '../utils/types';
import { beanLabel, drinkDate } from '../utils/history';
import { formatVolume } from '../utils/units';
import { mediaUrl } from '../utils/media';
import DrinkGlyph from './DrinkGlyph';

export default function DrinkCard({ drink, bean, unit }: { drink: DrinkLog; bean?: Bean; unit: string }) {
  const photo = mediaUrl(drink.thumbnail_path);
  return <article className="card drink-card p-4">
    <div className="flex gap-3">
      <Link to={`/drinks/${drink.id}`} aria-label={`Open ${drink.custom_label || drink.drink_type} from ${drinkDate(drink.created_at).toLocaleDateString()}`} className="grid h-18 w-18 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-muted">
        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" /> : <DrinkGlyph type={drink.drink_type} className="h-14 w-14" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2"><Link to={`/drinks/${drink.id}`} className="font-bold hover:text-accent">{drink.custom_label || drink.drink_type}</Link><span className="rating-badge" aria-label={`${drink.overall_rating} out of 5 stars`}><Star size={13} fill="currentColor" />{drink.overall_rating}</span></div>
        <Link to={`/beans/${drink.bean_id}`} className="mt-0.5 block text-sm text-muted hover:text-accent">{beanLabel(bean)}</Link>
        <time className="mt-1 block text-xs text-muted" dateTime={drinkDate(drink.created_at).toISOString()}>{drinkDate(drink.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{drink.made_by ? ` · ${drink.made_by}` : ''}</time>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span>Grind <b className="text-text">{drink.grind_setting}</b></span><span><b className="text-text">{formatVolume(drink.coffee_volume_ml, unit)}</b> coffee</span>{drink.milk_volume_ml > 0 && <span><b className="text-text">{formatVolume(drink.milk_volume_ml, unit)}</b> milk</span>}{drink.dialed_in && <span className="text-success">Dialed in</span>}</div>
    {drink.notes && <p className="mt-3 line-clamp-2 text-sm text-muted">{drink.notes}</p>}
    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold"><Link className="inline-flex items-center gap-1 text-accent" to={`/?repeat=${drink.id}`}><RotateCcw size={14} /> Brew again</Link><Link className="inline-flex items-center gap-1 text-muted hover:text-accent" to={`/drinks/type/${encodeURIComponent(drink.drink_type)}`}>Compare beans <ArrowUpRight size={14} /></Link></div>
  </article>;
}
