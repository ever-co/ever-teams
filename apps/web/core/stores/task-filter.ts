import { atom } from 'jotai';

export const taskBlockFilterState = atom<
  'all' | 'running' | 'online' | 'pause' | 'idle' | 'suspended'
>('all');
