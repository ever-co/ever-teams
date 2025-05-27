import { atom } from 'jotai';
import {
	IActivityReport,
	ITimeLogGroupedDailyReport,
	ITimeLogReportDaily,
	ITimeLogReportDailyChart
} from '../types/interfaces/activity/IActivityReport';
import { ITimeLog } from '../types/interfaces/time-log/ITimeLog';
import { IOrganizationTeam } from '../types/interfaces/team/IOrganizationTeam';
import { IOrganizationProject } from '../types/interfaces/project/IOrganizationProject';
import { ITask, ITasksStatistics } from '../types/interfaces/task/ITask';
import { TimeFrequency } from '../types/enums/date';
import { IUpdateTimesheetRequest } from '../types/interfaces/timesheet/ITimesheet';
import { IOrganizationTeamEmployee } from '../types/interfaces/team/IOrganizationTeamEmployee';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<ITimeLogReportDaily[]>([]);

export const timesheetRapportState = atom<ITimeLog[]>([]);

export const timesheetFilterEmployeeState = atom<IOrganizationTeamEmployee[]>([]);
export const timesheetFilterProjectState = atom<IOrganizationProject[]>([]);
export const timesheetFilterTaskState = atom<ITask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<TimeFrequency>(TimeFrequency.DAILY);
export const timesheetUpdateStatus = atom<IUpdateTimesheetRequest[]>([]);
export const timesheetUpdateState = atom<ITimeLog | null>(null);
export const selectTimesheetIdState = atom<ITimeLog[]>([]);
export const timeLogsRapportChartState = atom<ITimeLogReportDailyChart[]>([]);
export const timeLogsRapportDailyState = atom<ITimeLogGroupedDailyReport[]>([]);
export const timesheetStatisticsCountsState = atom<ITasksStatistics | null>(null);
export const allTeamsState = atom<IOrganizationTeam[]>([]);
export const allUserState = atom<IOrganizationTeamEmployee[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
