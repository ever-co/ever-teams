import {
	ITimerDailyLog,
	ITimerLogGrouped,
	TimesheetLog,
	UpdateTimesheetStatus
} from '@/core/types/interfaces/to-review/timer/ITimerLog';
import { ITimesheetStatisticsData } from '@/core/types/interfaces/to-review/timer/ITimerLog';
import { IOrganizationTeam, OT_Member } from '@/core/types/interfaces/to-review/IOrganizationTeam';
import { ITimerLogsDailyReport } from '@/core/types/interfaces/to-review/timer/ITimerLogs';
import { atom } from 'jotai';
import { IActivityReport } from '@/core/types/interfaces/to-review/activity-report/IActivityReport';
import { IOrganizationProject } from '@/core/types/interfaces/project/IOrganizationProject';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { TimeFrequency } from '@/core/types/enums/date';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<TimesheetLog[]>([]);

export const timesheetFilterEmployeeState = atom<OT_Member[]>([]);
export const timesheetFilterProjectState = atom<IOrganizationProject[]>([]);
export const timesheetFilterTaskState = atom<ITask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<TimeFrequency>(TimeFrequency.DAILY);
export const timesheetUpdateStatus = atom<UpdateTimesheetStatus[]>([]);
export const timesheetUpdateState = atom<TimesheetLog | null>(null);
export const selectTimesheetIdState = atom<TimesheetLog[]>([]);
export const timeLogsRapportChartState = atom<ITimerDailyLog[]>([]);
export const timeLogsRapportDailyState = atom<ITimerLogGrouped[]>([]);
export const timesheetStatisticsCountsState = atom<ITimesheetStatisticsData | null>(null);
export const allTeamsState = atom<IOrganizationTeam[]>([]);
export const allUserState = atom<OT_Member[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
