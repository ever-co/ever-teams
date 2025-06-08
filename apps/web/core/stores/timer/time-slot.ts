import { atom } from 'jotai';
import { IDetailTimerSite } from '@/core/types/interfaces/timer/detail-timer-site';
import { IActivity } from '@/core/types/interfaces/activity/activity';
import { TTimeSlot } from '@/core/types/schemas';

export const timeSlotsState = atom<TTimeSlot[]>([]);

export const timeAppsState = atom<IActivity[]>([]);

export const timeVisitedSitesState = atom<IActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
