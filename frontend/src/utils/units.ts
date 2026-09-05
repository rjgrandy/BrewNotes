export const ML_PER_OZ = 29.5735;

export const mlToOz = (ml: number) => ml / ML_PER_OZ;
export const ozToMl = (oz: number) => oz * ML_PER_OZ;

export type Unit = 'oz' | 'ml';

export const formatVolume = (ml: number, unit: string) => {
  if (unit === 'oz') {
    return `${mlToOz(ml).toFixed(1)} oz`;
  }
  return `${Math.round(ml)} ml`;
};

/** Value shown inside a volume input for a stored ml amount. */
export const volumeToInput = (ml: number, unit: string) =>
  unit === 'oz' ? mlToOz(ml).toFixed(1) : String(Math.round(ml));

/** Convert an input string back to ml, or null when it isn't a number. */
export const inputToMl = (value: string, unit: string): number | null => {
  if (value.trim() === '') return null;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return null;
  return unit === 'oz' ? ozToMl(num) : num;
};

/** True when the input already represents the stored ml value (so a sync
 *  effect should not clobber what the user is typing). */
export const inputMatchesMl = (value: string, ml: number, unit: string) => {
  const parsed = inputToMl(value, unit);
  if (parsed === null) return false;
  return Math.abs(parsed - ml) < 0.05;
};
