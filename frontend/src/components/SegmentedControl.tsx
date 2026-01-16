import { ReactNode } from 'react';

type Option = {
  value: string;
  label: ReactNode;
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
    <div className={`segmented-control${className ? ` ${className}` : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'segmented-item active' : 'segmented-item'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
