import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const openMenusState = atom<{ [key: string]: boolean }>({});

export const openMenusStateStorage = atomWithStorage<{ [key: string]: boolean }>('sidebar-open-menus', {});
export const activeMenuIndexState = atom<number | null>(null);
export const activeSubMenuIndexState = atom<number | null>(null);
