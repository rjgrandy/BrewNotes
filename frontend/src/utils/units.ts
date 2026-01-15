export const mlToOz = (ml: number) => ml / 29.5735;
export const ozToMl = (oz: number) => oz * 29.5735;

export const formatVolume = (ml: number, unit: string) => {
  if (unit === 'oz') {
    return `${mlToOz(ml).toFixed(1)} oz`;
  }
  return `${ml.toFixed(0)} ml`;
};
