import { atom } from 'jotai';
import { TTimeLimitReportList } from '@/core/types/schemas';

export const timeLimitsAtom = atom<TTimeLimitReportList[]>([]);
