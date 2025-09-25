import { ETaskPriority, ETaskSize, ETaskStatusName, EIssueType } from '../../generics/enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { IEmployee } from '../organization/employee';
import { IRelationalOrganizationProject } from '../project/organization-project';
import { IOrganizationTeam } from '../team/organization-team';
import { IIssueType } from './issue-type';
import { ITaskLinkedIssue } from './task-linked-issue';
import { ITaskPriority } from './task-priority';
import { ITaskSize } from './task-size';
import { ITaskStatus } from './task-status/task-status';

export interface IBaseTaskProperties extends IBasePerTenantAndOrganizationEntityModel {
	title: string;
	number?: number | null;
	public?: boolean | null;
	prefix?: string | null;
	description?: string | null;
	status?: ETaskStatusName | null;
	priority?: ETaskPriority | null;
	size?: ETaskSize | null;
	issueType?: EIssueType | null;
	startDate?: Date | null;
	resolvedAt?: Date | null;
	dueDate?: Date | null;
	estimate?: number | null;
	isDraft?: boolean | null; // Define if task is still draft (E.g : Task description not completed yet)
	isScreeningTask?: boolean | null; // Defines if the task still in discussion before to be accepted
	version?: string | null;
}

// Interface for task associations (related entities)
export interface ITaskAssociations extends ITaggable, IRelationalOrganizationProject {
	children?: ITask[] | null;
	members?: IEmployee[] | null;
	// invoiceItems?: IInvoiceItem[];
	teams?: IOrganizationTeam[];
	// modules?: IOrganizationProjectModule[];
	// taskSprints?: IOrganizationSprint[];
	// taskSprintHistories?: IOrganizationSprintTaskHistory[];
}

export interface ITask extends IBaseTaskProperties, ITaskAssociations {
	parent?: ITask;
	parentId?: ID | null;
	taskStatus?: ITaskStatus;
	taskStatusId?: ID | null;
	taskSize?: ITaskSize;
	taskSizeId?: ID | null;
	taskPriority?: ITaskPriority;
	taskPriorityId?: ID | null;
	taskType?: IIssueType;
	taskTypeId?: ID | null;
	rootEpic?: ITask;
	taskNumber?: string;
	totalWorkedTime?: number;
	selectedTeam?: IOrganizationTeam;
	linkedIssues?: ITaskLinkedIssue[];
	label?: string;
	estimateHours?: number;
	estimateMinutes?: number;
}

export interface TTaskStatistics extends ITask {
	duration?: number;
	durationPercentage?: number;
}
export interface ICreateTask {
	title: string;
	status?: string;
	size?: string;
	priority?: string;
	taskStatusId?: string;
	issueType?: string;
	members?: { id: string; [x: string]: any }[];
	estimateDays?: number;
	estimateHours?: string;
	estimateMinutes?: string;
	dueDate?: string;
	description: string;
	tags: { id: string }[];
	teams: { id: string }[];
	estimate: number;
	organizationId: string;
	tenantId: string;
	projectId?: string | null;
}
