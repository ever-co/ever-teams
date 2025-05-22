import { IActivity } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const taskTimesheetState = atom<IActivity[]>([]);
