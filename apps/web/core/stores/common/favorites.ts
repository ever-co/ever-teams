import { TFavorite } from '@/core/types/schemas/favorite/favorite.schema';
import { atom } from 'jotai';

export const organizationFavoritesState = atom<TFavorite[]>([]);
export const currentEmployeeFavoritesState = atom<TFavorite[]>([]);
