import { atom } from 'jotai';
import { ITask } from '@/core/types/interfaces/task/task';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import {
	IActivityReport,
	ITimeLogGroupedDailyReport,
	ITimeLogReportDaily,
	ITimeLogReportDailyChart
} from '@/core/types/interfaces/activity/activity-report';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import { ITimesheetCountsStatistics, IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimeFrequency } from '@/core/types/generics/enums/date';

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
