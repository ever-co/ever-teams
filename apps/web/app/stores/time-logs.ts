import { ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import { atom } from 'jotai';
import { ITimeSheet } from '../interfaces';

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<ITimeSheet[]>([])
