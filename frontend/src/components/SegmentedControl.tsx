import { ReactNode } from 'react';

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
  hideLabels?: boolean;
};

export default function SegmentedControl({ value, options, onChange, ariaLabel, className, hideLabels = false }: Props) {
  return (
    <div className={`segmented-control${className ? ` ${className}` : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.ariaLabel ?? (typeof option.label === 'string' ? option.label : undefined)}
          className={value === option.value ? 'segmented-item active' : 'segmented-item'}
          onClick={() => onChange(option.value)}
        >
          {hideLabels ? <span className="segmented-marker" aria-hidden="true" /> : option.label}
        </button>
      ))}
    </div>
  );
}
