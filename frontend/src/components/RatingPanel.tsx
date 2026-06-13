import StarRating from './StarRating';
import SegmentedControl from './SegmentedControl';
import { Switch } from './ui/Switch';

export type RatingValues = {
  overall_rating: number;
  sweetness: number;
  bitterness: number;
  acidity: number;
  body_mouthfeel: number;
  balance: number;
  would_make_again: boolean;
  dialed_in: boolean;
};

type Props = {
  value: RatingValues;
  onChange: (patch: Partial<RatingValues>) => void;
};

const DIMENSIONS: { key: keyof RatingValues; label: string }[] = [
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'bitterness', label: 'Bitterness' },
  { key: 'acidity', label: 'Acidity' },
  { key: 'body_mouthfeel', label: 'Body' }
];

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

      <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {DIMENSIONS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted">{label}</span>
            <StarRating
              label={label}
              size={20}
              value={value[key] as number}
              onChange={(next) => onChange({ [key]: next } as Partial<RatingValues>)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="field-label">Sour</span>
          <span className="field-label">Balanced</span>
          <span className="field-label">Bitter</span>
        </div>
        <SegmentedControl
          ariaLabel="Sour to bitter balance"
          value={String(value.balance)}
          options={[
            { value: '1', label: '1', ariaLabel: 'Sour' },
            { value: '2', label: '2', ariaLabel: 'Leans sour' },
            { value: '3', label: '3', ariaLabel: 'Balanced' },
            { value: '4', label: '4', ariaLabel: 'Leans bitter' },
            { value: '5', label: '5', ariaLabel: 'Bitter' }
          ]}
          onChange={(next) => onChange({ balance: Number(next) })}
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
