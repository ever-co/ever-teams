import { TaskPriorityEnum, TaskSizeEnum, ITaskStatusNameEnum, ITaskIssueTypeEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../global/base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { IIssueType } from './IIssueType';
import { ITaskLinkedIssue } from './ITaskLinkedIssue';
import { ITaskPriority } from './ITaskPriority';
import { ITaskSize } from './ITaskSize';
import { ITaskStatus } from './task-status/ITaskStatus';

export interface IBaseTaskProperties extends IBasePerTenantAndOrganizationEntityModel {
	title: string;
	number?: number;
	public?: boolean;
	prefix?: string;
	description?: string;
	status?: ITaskStatusNameEnum;
	priority?: TaskPriorityEnum;
	size?: TaskSizeEnum;
	issueType?: ITaskIssueTypeEnum;
	startDate?: Date;
	resolvedAt?: Date;
	dueDate?: Date;
	estimate?: number;
	isDraft?: boolean; // Define if task is still draft (E.g : Task description not completed yet)
	isScreeningTask?: boolean; // Defines if the task still in discussion before to be accepted
	version?: string;
}

// Interface for task associations (related entities)
export interface ITaskAssociations extends ITaggable, IRelationalOrganizationProject {
	children?: ITask[];
	members?: IEmployee[];
	// invoiceItems?: IInvoiceItem[];
	teams?: IOrganizationTeam[];
	// modules?: IOrganizationProjectModule[];
	// taskSprints?: IOrganizationSprint[];
	// taskSprintHistories?: IOrganizationSprintTaskHistory[];
}

export interface ITask extends IBaseTaskProperties, ITaskAssociations {
	parent?: ITask;
	parentId?: ID; // Optional field for specifying the parent task ID
	taskStatus?: ITaskStatus;
	taskStatusId?: ID;
	taskSize?: ITaskSize;
	taskSizeId?: ID;
	taskPriority?: ITaskPriority;
	taskPriorityId?: ID;
	taskType?: IIssueType;
	taskTypeId?: ID;
	rootEpic?: ITask;
	taskNumber?: string;
	totalWorkedTime?: number;
	selectedTeam?: IOrganizationTeam;
	linkedIssues?: ITaskLinkedIssue[];
	label?: string;
	estimateHours?: number;
	estimateMinutes?: number;
}

export interface ITasksStatistics extends ITask {
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
