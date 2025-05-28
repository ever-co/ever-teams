import { ITag } from '@/core/types/interfaces/tag/tag';
import { atom } from 'jotai';

export const tagsState = atom<ITag[]>([]);
