import { atom } from 'jotai';
import { IDetailTimerSite } from '@/core/types/interfaces/timer/detail-timer-site';
import { TDailyActivity, TTimeSlot } from '@/core/types/schemas';

export const timeSlotsState = atom<TTimeSlot[]>([]);

export const timeAppsState = atom<TDailyActivity[]>([]);

export const timeVisitedSitesState = atom<TDailyActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
