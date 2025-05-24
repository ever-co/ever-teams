import { atom } from 'jotai';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { TimeFrequency } from '@/core/types/enums/date';
import { ITimeLog } from '@/core/types/interfaces/time-log/ITimeLog';
import { IOrganizationProject } from '@/core/types/interfaces/project/IOrganizationProject';
import { IOrganizationTeam } from '@/core/types/interfaces/team/IOrganizationTeam';
import {
	IActivityReport,
	ITimeLogGroupedDailyReport,
	ITimeLogReportDailyChart
} from '@/core/types/interfaces/activity/IActivityReport';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/ITimesheet';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>([]);

export const timesheetRapportState = atom<ITimeLog[]>([]);

export const timesheetFilterEmployeeState = atom<IOrganizationTeamEmployee[]>([]);
export const timesheetFilterProjectState = atom<IOrganizationProject[]>([]);
export const timesheetFilterTaskState = atom<ITask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<TimeFrequency>(TimeFrequency.DAILY);
export const timesheetUpdateStatus = atom<UpdateTimesheetStatus[]>([]);
export const timesheetUpdateState = atom<ITimeLog | null>(null);
export const selectTimesheetIdState = atom<ITimeLog[]>([]);
export const timeLogsRapportChartState = atom<ITimeLogReportDailyChart[]>([]);
export const timeLogsRapportDailyState = atom<ITimeLogGroupedDailyReport[]>([]);
export const timesheetStatisticsCountsState = atom<ITimesheetCountsStatistics | null>(null);
export const allTeamsState = atom<IOrganizationTeam[]>([]);
export const allUserState = atom<IOrganizationTeamEmployee[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
