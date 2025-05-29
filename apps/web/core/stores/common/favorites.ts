import { atom } from 'jotai';
import { IFavorite } from '@/core/types/interfaces/common/favorite';

export const favoritesState = atom<IFavorite[]>([]);

export const favoritesFetchingState = atom<boolean>(false);
