import { atom } from 'jotai';
import { IDetailTimerSite } from '@/core/types/interfaces/timer/IDetailTimerSite';
import { IActivity } from '@/core/types/interfaces/activity/IActivity';
import { ITimeSlot } from '@/core/types/interfaces/timer/time-slot/ITimeSlot';

export const timeSlotsState = atom<ITimeSlot[]>([]);

export const timeAppsState = atom<IActivity[]>([]);

export const timeVisitedSitesState = atom<IActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
