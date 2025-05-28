import { atom } from 'jotai';
import { ITimeLimitReport } from '@/core/types/interfaces/timesheet/time-limit-report';

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
