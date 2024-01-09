import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { atom } from 'recoil';

export const timeSlotsState = atom<ITimerSlot[]>({
	key: 'timeSlotsState',
	default: []
});
