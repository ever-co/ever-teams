import { ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import { atom } from 'jotai';

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);
