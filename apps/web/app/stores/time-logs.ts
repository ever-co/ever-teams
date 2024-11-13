import { ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import { atom } from 'jotai';
import { IProject, ITeamTask, ITimeSheet, OT_Member } from '../interfaces';

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<ITimeSheet[]>([])

export const timesheetFilterEmployeeState = atom<OT_Member | OT_Member[] | null>([]);
export const timesheetFilterProjectState = atom<IProject | IProject[] | null>([]);
export const timesheetFilterTaskState = atom<ITeamTask | ITeamTask[] | null>([])
export const timesheetFilterStatusState = atom<{
    value: string;
    label: string;
} | {
    value: string;
    label: string;
}[] | null>([])
