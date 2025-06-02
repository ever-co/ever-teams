import { TTag } from '@/core/types/schemas';
import { atom } from 'jotai';

export const tagsState = atom<TTag[]>([]);
