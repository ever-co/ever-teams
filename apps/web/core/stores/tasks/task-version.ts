import { TTaskVersion } from '@/core/types/schemas/task/task-version.schema';
import { atom } from 'jotai';

export const taskVersionsState = atom<TTaskVersion[]>([]);
