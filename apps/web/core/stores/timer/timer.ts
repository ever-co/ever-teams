import { atom } from 'jotai';
import { ILocalTimerStatus } from '../types/interfaces/timer/ITimerStatus';
import { ITimerStatus } from '../types/interfaces/timer/ITimerStatus';

export const timerStatusState = atom<ITimerStatus | null>(null);

export const timerStatusFetchingState = atom<boolean>(false);

export const timeCounterState = atom<number>(0);

export const timerSecondsState = atom<number>(0);

export const timeCounterIntervalState = atom<number>(0);

export const localTimerStatusState = atom<ILocalTimerStatus | null>(null);
