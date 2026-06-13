import { Star } from 'lucide-react';

type Props = { value: number; size?: number; className?: string };

export default function StarsDisplay({ value, size = 15, className }: Props) {
  return (
    <span className={className} aria-label={`${value} of 5 stars`} role="img">
      <span className="inline-flex items-center gap-0.5 align-middle">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= value ? 'text-star' : 'text-border-strong'}
            fill={star <= value ? 'currentColor' : 'none'}
            strokeWidth={star <= value ? 0 : 1.6}
          />
        ))}
      </span>
    </span>
  );
}
