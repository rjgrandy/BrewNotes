type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export default function ChipSelect({ options, value, onChange, ariaLabel }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          data-active={value === option}
          className="chip"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
