import { IDetailTimerSite, IActivity } from '@/core/types/interfaces/-timer/ITimerApp';
import { ITimerSlot } from '@/core/types/interfaces/-timer/ITimerSlot';
import { atom } from 'jotai';

export const timeSlotsState = atom<ITimerSlot[]>([]);

export const timeAppsState = atom<IActivity[]>([]);

export const timeVisitedSitesState = atom<IActivity[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
