import { IDetailTimerSite, ITimerApps } from '@app/interfaces/timer/ITimerApp';
import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { atom } from 'recoil';

export const timeSlotsState = atom<ITimerSlot[]>({
	key: 'timeSlotsState',
	default: []
});

export const timeAppsState = atom<ITimerApps[]>({
	key: 'timeAppsState',
	default: []
});

export const timeVisitedSitesState = atom<ITimerApps[]>({
	key: 'timeVisitedSiteState',
	default: []
});

export const timeAppVisitedDetail = atom<IDetailTimerSite>({
	key: 'timeAppVisitedDetail'
});
