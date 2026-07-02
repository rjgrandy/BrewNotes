import { Bean, DrinkLog } from './types';
import { DOSE_G_BY_STRENGTH } from './constants';

export const formatMoney = (value: number) => `$${value.toFixed(2)}`;

/** Estimated bean cost of one drink, or null when the bean has no price/size. */
export const drinkCost = (drink: DrinkLog, bean: Bean | undefined): number | null => {
  if (!bean?.price || !bean.bag_size_g) return null;
  const dose = DOSE_G_BY_STRENGTH[drink.strength_level] ?? DOSE_G_BY_STRENGTH.MEDIUM;
  return (bean.price / bean.bag_size_g) * dose;
};

/** Estimated cost of a medium-strength drink for a bean, or null without pricing. */
export const beanCostPerDrink = (bean: Pick<Bean, 'price' | 'bag_size_g'>): number | null => {
  if (!bean.price || !bean.bag_size_g) return null;
  return (bean.price / bean.bag_size_g) * DOSE_G_BY_STRENGTH.MEDIUM;
};
