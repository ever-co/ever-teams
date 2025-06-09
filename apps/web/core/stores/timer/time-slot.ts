import { atom } from 'jotai';
import { IDetailTimerSite } from '@/core/types/interfaces/timer/detail-timer-site';
import { TActivity, TTimeSlot } from '@/core/types/schemas';

export const timeSlotsState = atom<TTimeSlot[]>([]);

export const timeAppsState = atom<TActivity[]>([]);

export const timeVisitedSitesState = atom<TActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
