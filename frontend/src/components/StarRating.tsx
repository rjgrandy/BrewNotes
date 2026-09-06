import { useState } from 'react';
import { Star } from 'lucide-react';
import { radioKeyboard } from '../utils/radioKeyboard';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: number;
};

const stars = [1, 2, 3, 4, 5];

export default function StarRating({ label, value, onChange, size = 26 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
      {stars.map((star) => {
        const active = displayValue >= star;
        return (
          <button
            key={star}
            type="button"
            className="star-btn"
            data-active={active}
            role="radio"
            aria-checked={value === star}
            tabIndex={value === star || (!value && star === 1) ? 0 : -1}
            onKeyDown={event => radioKeyboard(event, star - 1, stars.length, next => onChange(stars[next]))}
            aria-label={`Set ${label} to ${star} ${star === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
          >
            <Star size={size} fill={active ? 'currentColor' : 'none'} strokeWidth={active ? 0 : 1.8} />
          </button>
        );
      })}
    </div>
  );
}
