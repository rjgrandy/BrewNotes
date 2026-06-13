import { RecipeSettings } from '../utils/types';
import { formatVolume } from '../utils/units';

const STRENGTH: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'Strong' };
const BODY: Record<string, string> = { LIGHT: 'Light', MEDIUM: 'Medium', BOLD: 'Bold' };
const ORDER: Record<string, string> = { COFFEE_FIRST: 'Coffee first', MILK_FIRST: 'Milk first' };

// One-line summary, e.g. "G3 · 1.2 oz · Strong"
export const recipeSummaryText = (settings: RecipeSettings, unit: string): string => {
  const parts: string[] = [];
  if (settings.grind_setting != null) parts.push(`G${settings.grind_setting}`);
  if (settings.coffee_volume_ml != null) parts.push(formatVolume(Number(settings.coffee_volume_ml), unit));
  if (settings.strength_level) parts.push(STRENGTH[settings.strength_level] ?? settings.strength_level);
  return parts.join(' · ');
};

export default function RecipeSummary({ settings, unit }: { settings: RecipeSettings; unit: string }) {
  const stats: [string, string | null][] = [
    ['Grind', settings.grind_setting != null ? String(settings.grind_setting) : null],
    ['Coffee', settings.coffee_volume_ml != null ? formatVolume(Number(settings.coffee_volume_ml), unit) : null],
    ['Milk', settings.milk_volume_ml != null ? formatVolume(Number(settings.milk_volume_ml), unit) : null],
    ['Strength', settings.strength_level ? STRENGTH[settings.strength_level] ?? settings.strength_level : null],
    ['Temp', settings.temperature_level ?? null],
    ['Body', settings.body_level ? BODY[settings.body_level] ?? settings.body_level : null],
    ['Order', settings.order ? ORDER[settings.order] ?? settings.order : null]
  ];
  const shown = stats.filter(([, value]) => value != null);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {shown.map(([label, value]) => (
        <div key={label} className="card-muted px-3 py-2">
          <div className="field-label">{label}</div>
          <div className="font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
