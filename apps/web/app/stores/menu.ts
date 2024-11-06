import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const openMenusState = atom<{ [key: string]: boolean }>({});

export const openMenusStateStorage = atomWithStorage<{ [key: string]: boolean }>('sidebar-open-menus', {});
export const activeMenuIndexState = atomWithStorage<number | null>('active-menu-index', null);
export const activeSubMenuIndexState = atomWithStorage<number | null>('active-sub-menu-index', null);
