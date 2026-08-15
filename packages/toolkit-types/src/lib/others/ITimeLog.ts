import { LogType, TimerSource } from '../atoms/enums';
import { IEmployeeWithUser } from '../atoms/interfaces';
import { IOrganizationContact } from './IClient';
import { IProject } from './IProject';

export interface ITimeLogTask {
	id: string;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
	title: string;
	number: number;
	prefix: string;
	description: string;
	status: string;
	priority: string | null;
	size: string | null;
	issueType: string | null;
	estimate: number | null;
	dueDate: string;
	startDate: string | null;
	resolvedAt: string | null;
	version: string | null;
	taskNumber: string;
}

export interface ITimeLog {
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	deletedByUserId: string | null;
	id: string;
	isActive: boolean;
	isArchived: boolean;
	archivedAt: string | null;
	tenantId: string;
	organizationId: string;
	startedAt: string;
	stoppedAt: string;
	editedAt: string | null;
	logType: LogType;
	source: TimerSource;
	description: string;
	reason: string | null;
	isBillable: boolean;
	isRunning: boolean;
	version: string | null;
	employeeId: string;
	timesheetId: string;
	projectId: string;
	taskId: string;
	organizationContactId: string;
	organizationTeamId: string | null;
	project: IProject;
	task: ITimeLogTask;
	organizationContact: IOrganizationContact;
	employee: IEmployeeWithUser;
	duration: number;
	isEdited: boolean;
}

export interface ITimeLogCreateInput {
	startedAt: string;
	stoppedAt: string;
	projectId?: string;
	taskId?: string;
	organizationContactId?: string;
	organizationTeamId?: string | null;
	employeeId?: string;
	organizationId: string;
	tenantId: string;
	description?: string;
	logType?: LogType;
	source?: TimerSource;
	reason?: string;
	isBillable?: boolean;
}
