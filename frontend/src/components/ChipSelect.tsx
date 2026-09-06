import { radioKeyboard } from '../utils/radioKeyboard';

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export default function ChipSelect({ options, value, onChange, ariaLabel }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          onKeyDown={event => radioKeyboard(event, index, options.length, next => onChange(options[next]))}
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
