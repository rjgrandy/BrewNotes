import { ReactNode } from 'react';
import { cn } from './ui/cn';
import { radioKeyboard } from '../utils/radioKeyboard';

type Option = {
  value: string;
  label: ReactNode;
  ariaLabel?: string;
};

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
};

export default function SegmentedControl({ value, options, onChange, ariaLabel, className }: Props) {
  return (
    <div className={cn('segmented', className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onKeyDown={event => radioKeyboard(event, index, options.length, next => onChange(options[next].value))}
          aria-label={option.ariaLabel ?? (typeof option.label === 'string' ? option.label : undefined)}
          data-active={value === option.value}
          className="segmented-item"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
