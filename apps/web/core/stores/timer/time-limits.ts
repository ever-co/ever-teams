import { atom } from 'jotai';
import { ITimeLimitReport } from '@/core/types/interfaces/timesheet/ITimeLimitsReport';

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
