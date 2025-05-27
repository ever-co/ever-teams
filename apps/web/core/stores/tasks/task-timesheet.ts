import { IActivity } from '../types/interfaces/activity/IActivity';
import { atom } from 'jotai';

export const taskTimesheetState = atom<IActivity[]>([]);
