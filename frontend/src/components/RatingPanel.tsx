import StarRating from './StarRating';
import { Slider } from './ui/Slider';
import { Switch } from './ui/Switch';

export type RatingValues = {
  overall_rating: number;
  balance: number;
  would_make_again: boolean;
  dialed_in: boolean;
};

type Props = {
  value: RatingValues;
  onChange: (patch: Partial<RatingValues>) => void;
};

const BALANCE_LABEL: Record<number, string> = {
  1: 'Sour',
  2: 'Leans sour',
  3: 'Balanced',
  4: 'Leans bitter',
  5: 'Bitter'
};

export default function RatingPanel({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card-muted flex flex-col items-center gap-2 p-4">
        <span className="field-label">Overall</span>
        <StarRating
          label="Overall rating"
          size={34}
          value={value.overall_rating}
          onChange={(overall_rating) => onChange({ overall_rating })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="field-label">Sour</span>
          <span className="text-sm font-semibold text-accent">{BALANCE_LABEL[value.balance]}</span>
          <span className="field-label">Bitter</span>
        </div>
        <Slider
          ariaLabel="Sour to bitter balance"
          value={value.balance}
          min={1}
          max={5}
          step={1}
          onValueChange={(balance) => onChange({ balance })}
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="card-muted flex items-center justify-between gap-3 px-3.5 py-3">
          <span className="text-sm font-semibold">Would make again</span>
          <Switch
            ariaLabel="Would make again"
            checked={value.would_make_again}
            onCheckedChange={(would_make_again) => onChange({ would_make_again })}
          />
        </label>
        <label className="card-muted flex items-center justify-between gap-3 px-3.5 py-3">
          <span className="text-sm font-semibold">Dialed in</span>
          <Switch
            ariaLabel="Dialed in"
            checked={value.dialed_in}
            onCheckedChange={(dialed_in) => onChange({ dialed_in })}
          />
        </label>
      </div>
    </div>
  );
}
