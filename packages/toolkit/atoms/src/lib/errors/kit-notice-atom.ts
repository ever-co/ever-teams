import { atom } from 'jotai';
import type { KitNotice } from './kit-error';

// The page's notice, shared by everything under a TeamsProvider: the user read (a refused stored session) and the
// shared timer status both report into it, and KitNotice draws it in the widgets.
export const kitNoticeAtom = atom<KitNotice | null>(null);
