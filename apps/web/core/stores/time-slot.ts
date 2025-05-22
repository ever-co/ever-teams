import { IDetailTimerSite, ITimerApps } from '@/core/types/interfaces/-timer/ITimerApp';
import { ITimerSlot } from '@/core/types/interfaces/-timer/ITimerSlot';
import { atom } from 'jotai';

export const timeSlotsState = atom<ITimerSlot[]>([]);

export const timeAppsState = atom<ITimerApps[]>([]);

export const timeVisitedSitesState = atom<ITimerApps[]>([]);

export const timeAppVisitedDetail = atom<IDetailTimerSite>();
