import { useEffect, useState } from 'react';
import SegmentedControl from './SegmentedControl';
import { Slider } from './ui/Slider';
import { RecipeSettings } from '../utils/types';
import { mlToOz, ozToMl } from '../utils/units';

type Props = {
  value: RecipeSettings;
  onChange: (patch: Partial<RecipeSettings>) => void;
  unit: string;
};

const formatVol = (ml: number, unit: string) => (unit === 'oz' ? mlToOz(ml).toFixed(1) : String(Math.round(ml)));

function VolumeInput({
  label,
  valueMl,
  unit,
  onChangeMl
}: {
  label: string;
  valueMl: number;
  unit: string;
  onChangeMl: (ml: number) => void;
}) {
  const [text, setText] = useState(formatVol(valueMl, unit));

  // Re-sync only when the value changes from the outside (e.g. recipe prefill),
  // not on every keystroke (which would fight the cursor).
  useEffect(() => {
    const current = text.trim() === '' ? NaN : unit === 'oz' ? ozToMl(Number(text)) : Number(text);
    if (Number.isNaN(current) || Math.abs(current - valueMl) > 0.5) {
      setText(formatVol(valueMl, unit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMl, unit]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">
        {label} ({unit})
      </span>
      <input
        className="input"
        type="number"
        min="0"
        step={unit === 'oz' ? '0.1' : '1'}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (next.trim() === '') return;
          const num = Number(next);
          if (!Number.isFinite(num) || num < 0) return;
          onChangeMl(unit === 'oz' ? ozToMl(num) : num);
        }}
        onBlur={() => {
          if (text.trim() === '' || Number(text) < 0) { onChangeMl(0); setText(formatVol(0, unit)); }
        }}
      />
    </label>
  );
}

export default function RecipeControls({ value, onChange, unit }: Props) {
  const grind = value.grind_setting ?? 4;

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Strength</span>
        <SegmentedControl
          ariaLabel="Strength level"
          value={value.strength_level ?? 'MEDIUM'}
          options={[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'Strong' }
          ]}
          onChange={(strength_level) => onChange({ strength_level })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Temperature</span>
        <SegmentedControl
          ariaLabel="Temperature level"
          value={value.temperature_level ?? 'MEDIUM'}
          options={[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' }
          ]}
          onChange={(temperature_level) => onChange({ temperature_level })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Body</span>
        <SegmentedControl
          ariaLabel="Body level"
          value={value.body_level ?? 'MEDIUM'}
          options={[
            { value: 'LIGHT', label: 'Light' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'BOLD', label: 'Bold' }
          ]}
          onChange={(body_level) => onChange({ body_level })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Pour Order</span>
        <SegmentedControl
          ariaLabel="Pour order"
          value={value.order ?? 'COFFEE_FIRST'}
          options={[
            { value: 'COFFEE_FIRST', label: 'Coffee First' },
            { value: 'MILK_FIRST', label: 'Milk First' }
          ]}
          onChange={(order) => onChange({ order })}
        />
      </div>
      <VolumeInput
        label="Coffee Volume"
        unit={unit}
        valueMl={value.coffee_volume_ml ?? 0}
        onChangeMl={(coffee_volume_ml) => onChange({ coffee_volume_ml })}
      />
      <VolumeInput
        label="Milk Volume"
        unit={unit}
        valueMl={value.milk_volume_ml ?? 0}
        onChangeMl={(milk_volume_ml) => onChange({ milk_volume_ml })}
      />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <div className="flex items-center justify-between">
          <span className="field-label">Grind</span>
          <span className="badge">{grind}</span>
        </div>
        <Slider
          ariaLabel="Grind setting"
          value={grind}
          min={1}
          max={7}
          step={1}
          onValueChange={(grind_setting) => onChange({ grind_setting })}
        />
      </div>
    </div>
  );
}
