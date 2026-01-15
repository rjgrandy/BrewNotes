export type Bean = {
  id: string;
  name: string;
  roaster?: string | null;
  origin?: string | null;
  process?: string | null;
  roast_level?: string | null;
  tasting_notes?: string | null;
  roast_date?: string | null;
  open_date?: string | null;
  bag_size_g?: number | null;
  price?: number | null;
  decaf: boolean;
  notes?: string | null;
  image_path?: string | null;
  thumbnail_path?: string | null;
  archived: boolean;
  current_best_settings?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type DrinkLog = {
  id: string;
  created_at: string;
  bean_id: string;
  drink_type: string;
  custom_label?: string | null;
  made_by?: string | null;
  rated_by?: string | null;
  temperature_level: string;
  body_level: string;
  order: string;
  coffee_volume_ml: number;
  milk_volume_ml: number;
  strength_level: string;
  grind_setting: number;
  overall_rating: number;
  sweetness: number;
  bitterness: number;
  acidity: number;
  body_mouthfeel: number;
  balance: number;
  would_make_again: boolean;
  dialed_in: boolean;
  notes?: string | null;
  photo_path?: string | null;
  thumbnail_path?: string | null;
};

export type BeanAnalytics = {
  rating_vs_grind: { x: number; y: number }[];
  rating_vs_coffee_volume: { x: number; y: number }[];
  rating_by_temperature: { temperature_level: string; average_rating: number }[];
  rating_timeline: { date: string; average_rating: number }[];
  radar: { category: string; average: number; top_rated_average?: number | null }[];
};

export type RecommendedSettings = {
  recommended?: Record<string, unknown> | null;
  highest_rated?: Record<string, unknown> | null;
  total_considered: number;
};
