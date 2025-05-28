import { atom } from 'jotai';
import {
	IActivityReport,
	ITimeLogGroupedDailyReport,
	ITimeLogReportDaily,
	ITimeLogReportDailyChart
} from '../types/interfaces/activity/activity-report';
import { ITimeLog } from '../types/interfaces/timer/time-log/time-log';
import { IOrganizationTeam } from '../types/interfaces/team/organization-team';
import { IOrganizationProject } from '../types/interfaces/project/organization-project';
import { ITask } from '../types/interfaces/task/task';
import { ETimeFrequency } from '../types/interfaces/enums/date';
import {
	ITimesheet,
	ITimesheetCountsStatistics,
	IUpdateTimesheetRequest
} from '../types/interfaces/timesheet/timesheet';
import { IOrganizationTeamEmployee } from '../types/interfaces/team/organization-team-employee';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<ITimeLogReportDaily[]>([]);

export const timesheetRapportState = atom<ITimesheet[]>([]);

export const timesheetFilterEmployeeState = atom<IOrganizationTeamEmployee[]>([]);
export const timesheetFilterProjectState = atom<IOrganizationProject[]>([]);
export const timesheetFilterTaskState = atom<ITask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
export const timesheetGroupByDayState = atom<ETimeFrequency>(ETimeFrequency.DAILY);
export const timesheetUpdateStatus = atom<IUpdateTimesheetRequest[]>([]);
export const timesheetUpdateState = atom<ITimeLog | null>(null);
export const selectTimesheetIdState = atom<ITimeLog[]>([]);
export const timeLogsRapportChartState = atom<ITimeLogReportDailyChart[]>([]);
export const timeLogsRapportDailyState = atom<ITimeLogGroupedDailyReport[]>([]);
export const timesheetStatisticsCountsState = atom<ITimesheetCountsStatistics | null>(null);
export const allTeamsState = atom<IOrganizationTeam[]>([]);
export const allUserState = atom<IOrganizationTeamEmployee[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
