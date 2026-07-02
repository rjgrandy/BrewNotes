export const DRINK_TYPES = [
  'Espresso',
  'Americano',
  'Coffee',
  'Cortado',
  'Cappuccino',
  'Latte',
  'Flat White',
  'Macchiato'
];

export const DEFAULT_SETTINGS = {
  temperature_level: 'MEDIUM',
  body_level: 'MEDIUM',
  order: 'COFFEE_FIRST',
  coffee_volume_ml: 30,
  milk_volume_ml: 0,
  strength_level: 'MEDIUM',
  grind_setting: 4
};

// Approximate grams of beans the KF7 doses per drink at each strength level.
// Used only for cost estimates.
export const DOSE_G_BY_STRENGTH: Record<string, number> = {
  LOW: 8,
  MEDIUM: 11,
  HIGH: 14
};

export const DEFAULT_RATINGS = {
  overall_rating: 3,
  sweetness: 3,
  bitterness: 3,
  acidity: 3,
  body_mouthfeel: 3,
  balance: 3,
  would_make_again: false,
  dialed_in: false
};
