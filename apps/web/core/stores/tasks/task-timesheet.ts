import { IActivity } from '@/core/types/interfaces/activity/activity';
import { atom } from 'jotai';

export const taskTimesheetState = atom<IActivity[]>([]);
