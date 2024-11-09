import { ILocalTimerStatus, ITimerStatus } from '@app/interfaces/ITimer';
import { atom } from 'jotai';

export const timerStatusState = atom<ITimerStatus | null>(null);

export const timerStatusFetchingState = atom<boolean>(false);

export const timeCounterState = atom<number>(0);

export const timerSecondsState = atom<number>(0);

export const timeCounterIntervalState = atom<number>(0);

export const localTimerStatusState = atom<ILocalTimerStatus | null>(null);
