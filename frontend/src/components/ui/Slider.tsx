import * as SliderPrimitive from '@radix-ui/react-slider';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  ariaLabel: string;
};

export function Slider({ value, min, max, step = 1, onValueChange, ariaLabel }: Props) {
  return (
    <SliderPrimitive.Root
      className="slider-root"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(values) => onValueChange(values[0])}
      aria-label={ariaLabel}
    >
      <SliderPrimitive.Track className="slider-track">
        <SliderPrimitive.Range className="slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="slider-thumb" aria-label={ariaLabel} />
    </SliderPrimitive.Root>
  );
}
