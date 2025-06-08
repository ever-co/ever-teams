import { TActivity } from '@/core/types/schemas';
import { atom } from 'jotai';

export const taskTimesheetState = atom<TActivity[]>([]);
