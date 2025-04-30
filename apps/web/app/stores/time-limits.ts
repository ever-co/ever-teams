import { atom } from 'jotai';
import { ITimeLimitReport } from '../../core/types/interfaces/ITimeLimits';

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
