import { ITaskTimesheet } from '@app/interfaces';
import { atom } from 'jotai';

export const taskTimesheetState = atom<ITaskTimesheet[]>([]);
