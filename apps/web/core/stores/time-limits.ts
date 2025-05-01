import { atom } from 'jotai';
import { ITimeLimitReport } from '../types/interfaces/ITimeLimits';

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
