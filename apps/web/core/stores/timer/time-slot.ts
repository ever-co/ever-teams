import { atom } from 'jotai';
import { IDetailTimerSite } from '@/core/types/interfaces/timer/detail-timer-site';
import { IActivity } from '@/core/types/interfaces/activity/activity';
import { ITimeSlot } from '@/core/types/interfaces/timer/time-slot/time-slot';

export const timeSlotsState = atom<ITimeSlot[]>([]);

export const timeAppsState = atom<IActivity[]>([]);

export const timeVisitedSitesState = atom<IActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
