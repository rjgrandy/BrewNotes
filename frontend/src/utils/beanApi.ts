import { apiSend, uploadFile } from './api';
import { Bean, BeanRecipe, RecipeSettings } from './types';

export const upsertRecipe = (
  beanId: string,
  drinkType: string,
  settings: RecipeSettings,
  source: 'manual' | 'from_drink' = 'manual',
  sourceDrinkId?: string | null
): Promise<BeanRecipe> =>
  apiSend<BeanRecipe>(`/api/beans/${beanId}/recipes/${encodeURIComponent(drinkType)}`, 'PUT', {
    settings,
    source,
    source_drink_id: sourceDrinkId ?? null
  });

export const deleteRecipe = (beanId: string, drinkType: string): Promise<{ status: string }> =>
  apiSend<{ status: string }>(`/api/beans/${beanId}/recipes/${encodeURIComponent(drinkType)}`, 'DELETE');

export const uploadBeanPhoto = (beanId: string, file: File): Promise<Bean> =>
  uploadFile<Bean>(`/api/beans/${beanId}/photos`, file);

export const deleteBeanPhoto = (beanId: string, photoId: string): Promise<Bean> =>
  apiSend<Bean>(`/api/beans/${beanId}/photos/${photoId}`, 'DELETE');

export const setBeanCover = (beanId: string, photoId: string): Promise<Bean> =>
  apiSend<Bean>(`/api/beans/${beanId}/photos/${photoId}/cover`, 'POST');

// Pull the saved recipe settings for a given drink type, if any.
export const recipeForType = (bean: Bean | undefined, drinkType: string): RecipeSettings | undefined =>
  bean?.recipes?.find((recipe) => recipe.drink_type === drinkType)?.settings;
