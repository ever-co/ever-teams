import { atom } from 'jotai';
import { ILocalTimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

export const timerStatusState = atom<ITimerStatus | null>(null);

export const timerStatusFetchingState = atom<boolean>(false);

export const timeCounterState = atom<number>(0);

export const timerSecondsState = atom<number>(0);

export const timeCounterIntervalState = atom<number>(0);

export const localTimerStatusState = atom<ILocalTimerStatus | null>(null);
