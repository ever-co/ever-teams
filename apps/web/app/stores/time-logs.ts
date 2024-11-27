import { ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import { atom } from 'jotai';
import { IProject, ITeamTask, OT_Member, TimesheetFilterByDays, TimesheetLog, UpdateTimesheetStatus } from '../interfaces';

interface IFilterOption {
    value: string;
    label: string;
}


export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<TimesheetLog[]>([])

export const timesheetFilterEmployeeState = atom<OT_Member[]>([]);
export const timesheetFilterProjectState = atom<IProject[]>([]);
export const timesheetFilterTaskState = atom<ITeamTask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<TimesheetFilterByDays>('Daily')
export const timesheetUpdateStatus = atom<UpdateTimesheetStatus[]>([])
export const timesheetUpdateState = atom<TimesheetLog | null>(null)
