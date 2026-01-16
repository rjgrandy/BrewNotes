import { useState } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

const stars = [1, 2, 3, 4, 5];

export default function StarRating({ label, value, onChange }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div className="star-rating" role="radiogroup" aria-label={label}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={displayValue >= star ? 'star active' : 'star'}
          role="radio"
          aria-checked={value === star}
          aria-label={`Set ${label} to ${star} ${star === 1 ? 'star' : 'stars'}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(star)}
          onBlur={() => setHovered(null)}
        >
          ★
        </button>
      ))}
      <span className="star-value" aria-hidden="true">
        {value}
      </span>
    </div>
  );
}
