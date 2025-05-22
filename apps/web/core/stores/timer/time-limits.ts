import { atom } from 'jotai';
<<<<<<< HEAD:apps/web/core/stores/timer/time-limits.ts
import { ITimeLimitReport } from '../../types/interfaces/ITimeLimits';
=======
import { ITimeLimitReport } from '../types/interfaces/timesheet/ITimeLimitsReport';
>>>>>>> d2027d8b9 (refactor tasks and related types/interfaces):apps/web/core/stores/time-limits.ts

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
