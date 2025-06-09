import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ITask } from '@/core/types/interfaces/task/task';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import {
	IActivityReport,
	ITimeLogGroupedDailyReport,
	ITimeLogReportDailyChart
} from '@/core/types/interfaces/activity/activity-report';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import { ITimesheetCountsStatistics, IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimeFrequency } from '@/core/types/generics/enums/date';
import { TTimeLogReportDaily } from '@/core/types/schemas';

interface IFilterOption {
	value: string;
	label: string;
}

export const timerLogsDailyReportState = atom<TTimeLogReportDaily[]>([]);

export const timesheetRapportState = atom<ITimeLog[]>([]);

export const timesheetFilterEmployeeState = atom<IOrganizationTeamEmployee[]>([]);
export const timesheetFilterProjectState = atom<IOrganizationProject[]>([]);
export const timesheetFilterTaskState = atom<ITask[]>([]);

export const timesheetFilterStatusState = atom<IFilterOption[]>([]);
export const timesheetDeleteState = atom<string[]>([]);
// Use atomWithStorage to persist the frequency selection
export const timesheetGroupByDayState =
	typeof window !== 'undefined'
		? atomWithStorage<ETimeFrequency>('timesheet-frequency', ETimeFrequency.WEEKLY)
		: atom<ETimeFrequency>(ETimeFrequency.WEEKLY);
export const timesheetUpdateStatus = atom<IUpdateTimesheetRequest[]>([]);
export const timesheetUpdateState = atom<ITimeLog | null>(null);
export const selectTimesheetIdState = atom<ITimeLog[]>([]);
export const timeLogsRapportChartState = atom<ITimeLogReportDailyChart[]>([]);
export const timeLogsRapportDailyState = atom<ITimeLogGroupedDailyReport[]>([]);
export const timesheetStatisticsCountsState = atom<ITimesheetCountsStatistics | null>(null);
export const allTeamsState = atom<IOrganizationTeam[]>([]);
export const allUserState = atom<IOrganizationTeamEmployee[]>([]);
export const activityReportState = atom<IActivityReport[]>([]);
