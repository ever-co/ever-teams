import { IOrganizationTeamList } from '@/core/types/interfaces/to-review/IOrganizationTeam';
import {
	ITimerDailyLog,
	ITimerLogGrouped,
	UpdateTimesheetStatus
} from '@/core/types/interfaces/to-review/timer/ITimerLog';
import { ITimesheetStatisticsData } from '@/core/types/interfaces/to-review/timer/ITimerLog';
import { OT_Member } from '@/core/types/interfaces/to-review/IOrganizationTeam';
import { IProject, ITeamTask, TimesheetFilterByDays, TimesheetLog } from '@/core/types/interfaces/to-review';
import { ITimerLogsDailyReport } from '@/core/types/interfaces/to-review/timer/ITimerLogs';
import { atom } from 'jotai';
import { IActivityReport } from '@/core/types/interfaces/to-review/activity-report/IActivityReport';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<TimesheetLog[]>([]);

export const timesheetFilterEmployeeState = atom<OT_Member[]>([]);
export const timesheetFilterProjectState = atom<IProject[]>([]);
export const timesheetFilterTaskState = atom<ITeamTask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<TimesheetFilterByDays>('Daily');
export const timesheetUpdateStatus = atom<UpdateTimesheetStatus[]>([]);
export const timesheetUpdateState = atom<TimesheetLog | null>(null);
export const selectTimesheetIdState = atom<TimesheetLog[]>([]);
export const timeLogsRapportChartState = atom<ITimerDailyLog[]>([]);
export const timeLogsRapportDailyState = atom<ITimerLogGrouped[]>([]);
export const timesheetStatisticsCountsState = atom<ITimesheetStatisticsData | null>(null);
export const allTeamsState = atom<IOrganizationTeamList[]>([]);
export const allUserState = atom<OT_Member[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
