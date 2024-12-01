import { atom } from 'jotai';
import { ITimeLimitReport } from '../interfaces/ITimeLimits';

export const timeLimitsAtom = atom<ITimeLimitReport[]>([]);
