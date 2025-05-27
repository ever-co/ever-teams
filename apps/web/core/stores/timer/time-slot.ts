import { atom } from 'jotai';
import { IDetailTimerSite } from '../types/interfaces/timer/IDetailTimerSite';
import { IActivity } from '../types/interfaces/activity/IActivity';
import { ITimeSlot } from '../types/interfaces/timer/time-slot/ITimeSlot';

export const timeSlotsState = atom<ITimeSlot[]>([]);

export const timeAppsState = atom<IActivity[]>([]);

export const timeVisitedSitesState = atom<IActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
