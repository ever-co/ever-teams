import { ITaskTimesheet } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const taskTimesheetState = atom<ITaskTimesheet[]>([]);
