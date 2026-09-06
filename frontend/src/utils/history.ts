import { Bean, DrinkLog } from './types';

// SQLite's UTC timestamps have no suffix. Treat them as UTC in every view.
export const drinkDate = (value: string) => new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
export const averageRating = (drinks: DrinkLog[]) => drinks.length
  ? drinks.reduce((sum, d) => sum + d.overall_rating, 0) / drinks.length : 0;
export const beanLabel = (bean?: Bean) => bean ? [bean.roaster, bean.name].filter(Boolean).join(' · ') : 'Bean unavailable';
export type HistoryFilters = { query: string; type: string; bean: string; rating: string; sort: string; favorite: boolean };

export function filterDrinks(drinks: DrinkLog[], beans: Bean[], filters: HistoryFilters) {
  const byId = new Map(beans.map(bean => [bean.id, bean]));
  const query = filters.query.trim().toLowerCase();
  return drinks.filter(drink =>
    (!filters.type || drink.drink_type === filters.type) &&
    (!filters.bean || drink.bean_id === filters.bean) &&
    (!filters.rating || drink.overall_rating >= Number(filters.rating)) &&
    (!filters.favorite || drink.would_make_again) &&
    (!query || [beanLabel(byId.get(drink.bean_id)), drink.drink_type, drink.custom_label, drink.notes, drink.made_by]
      .some(value => value?.toLowerCase().includes(query)))
  ).sort((a, b) => {
    const recent = drinkDate(b.created_at).getTime() - drinkDate(a.created_at).getTime();
    if (filters.sort === 'oldest') return -recent;
    if (filters.sort === 'rating') return b.overall_rating - a.overall_rating || recent;
    if (filters.sort === 'grind') return a.grind_setting - b.grind_setting || recent;
    return recent;
  });
}
