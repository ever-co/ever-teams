import { ETimeLogType } from '../../generics/enums/timer';
import { IEmployee } from '../organization/employee';
import { IOrganizationContact } from '../organization/organization-contact';
import { IOrganizationProject } from '../project/organization-project';
import { ITask } from '../task/task';
import { TUser } from '@/core/types/schemas';

/**
 * Base interface for entities with tenant and organization
 */
interface IBaseTenantOrg {
	id: string;
	createdAt: string;
	updatedAt: string;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
}

/**
 * Project information in activity report
 */
export interface IActivityReportProject extends IBaseTenantOrg {
	name: string;
	taskListType: 'SPRINT' | 'GRID';
	budget: number;
	budgetType: 'hours';
	imageUrl: string;
	status: 'open' | 'ready-for-review' | 'custom';
	membersCount: number;
	organizationContactId: string;
	customFields: {
		repositoryId: null;
	};
}

/**
 * User information specific to activity report
 */
export interface IActivityReportUser
	extends Pick<
		TUser,
		'id' | 'firstName' | 'lastName' | 'email' | 'imageUrl' | 'preferredLanguage' | 'name' | 'isEmailVerified'
	> {
	preferredComponentLayout: 'TABLE';
}

/**
 * Employee information in activity report
 */
export interface IActivityReportEmployee extends IBaseTenantOrg {
	startedWorkOn: string;
	payPeriod: 'NONE' | 'TWICE_PER_MONTH';
	billRateValue: number;
	billRateCurrency: string;
	reWeeklyLimit: number;
	employeeLevel: 'A' | 'B' | 'C';
	profile_link: string;
	isTrackingEnabled: boolean;
	isOnline: boolean;
	isAway: boolean;
	isTrackingTime: boolean;
	allowScreenshotCapture: boolean;
	allowManualTime: boolean;
	allowModifyTime: boolean;
	allowDeleteTime: boolean;
	userId: string;
	user: IActivityReportUser;
	fullName: string;
}

/**
 * Single activity entry with duration and project information
 */
export interface IActivityItem {
	sessions: number;
	duration: number;
	employeeId: string;
	projectId: string;
	date: string;
	title: string;
	employee: IActivityReportEmployee;
	project: IActivityReportProject;
	duration_percentage: string;
}

/**
 * Project with its associated activities
 */
export interface IProjectWithActivity {
	project: IActivityReportProject;
	activity: IActivityItem[];
}

/**
 * Employee with their associated projects and activities
 */
export interface IEmployeeWithProjects {
	employee: IActivityReportEmployee;
	projects: IProjectWithActivity[];
}

/**
 * Activity report data grouped by date
 */
export interface IActivityReportGroupByDate {
	date: string;
	employees: IEmployeeWithProjects[];
}

/**
 * Complete activity report data structure
 * @example
 * const report: IActivityReport = await getActivityReportRequest(params);
 * report.forEach(day => {
 *   day.employees.forEach(emp => {
 *     emp.projects.forEach(proj => {
 *       // Access project activities
 *       proj.activity.forEach(act => console.log(act.duration));
 *     });
 *   });
 * });
 */
export type IActivityReport = IActivityReportGroupByDate[];

/**
 * Project activity information
 */
export interface IProjectActivity {
	title: string;
	totalDuration: number;
	totalSessions: number;
	activities: IActivityItem[];
	duration_percentage: number;
}

/**
 * Activity report data grouped by project
 */
export interface IActivityReportByProject {
	date: string;
	projects: IProjectActivity[];
}

/**
 * Group by options for activity report
 */
export enum ActivityReportGroupByEnum {
	DATE = 'date',
	EMPLOYEE = 'employee',
	PROJECT = 'project',
	CLIENT = 'client'
}

export interface ITimerValue {
	TRACKED: number;
	MANUAL: number;
	IDLE: number;
	RESUMED: number;
}

export interface ITimeLogReportDailyChart {
	date: string;
	value: ITimerValue;
}

export interface ITimeLogGroupedDailyReport {
	date: string;
	logs: ITimerProjectLog[];
}

export interface ITimerTaskLog {
	task: ITask;
	description: string;
	duration: number;
	client: IOrganizationContact;
}

export interface ITimerEmployeeLog {
	employee: IEmployee;
	sum: number;
	tasks: ITimerTaskLog[];
	activity: number;
}

export interface ITimerProjectLog {
	project: IOrganizationProject;
	employeeLogs: ITimerEmployeeLog[];
}

export interface ITimeLogReportDailyRequest {
	organizationId: string;
	tenantId: string;
	startDate: string | Date;
	endDate: string | Date;
	timeZone?: string;
	groupBy?: string;
	projectIds?: string[];
	employeeIds?: string[];
	taskIds?: string[];
	teamIds?: string[];
	logType?: ETimeLogType[];
	activityLevel?: {
		start: number;
		end: number;
	};
}

export interface ITimeLogReportDailyChartProps {
	activityLevel: {
		start: number;
		end: number;
	};
	start: number;
	end: number;
	organizationId: string;
	tenantId: string;
	startDate: string;
	endDate: string;
	timeZone?: string;
	projectIds?: string[];
	employeeIds?: string[];
	logType?: ETimeLogType[];
	teamIds?: string[];
	groupBy?: string;
	teamId?: string;
	userId?: string;
}

export interface ITimeLogReportDaily {
	activity: number;
	date: string; // '2024-07-19'
	sum: number; // in seconds
}
