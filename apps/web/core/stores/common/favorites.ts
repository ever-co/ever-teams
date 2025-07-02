import { TFavorite } from '@/core/types/schemas/favorite/favorite.schema';
import { atom } from 'jotai';

export const favoritesState = atom<TFavorite[]>([]);

export const favoritesFetchingState = atom<boolean>(false);
