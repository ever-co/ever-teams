import { TaskPriorityEnum, TaskSizeEnum, TaskStatusEnum, TaskTypeEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { IIssueType } from './IIssueType';
import { ITaskPriority } from './ITaskPriority';
import { ITaskSize } from './ITaskSize';
import { ITaskStatus } from './ITaskStatus';

export interface IBaseTaskProperties extends IBasePerTenantAndOrganizationEntityModel {
	title: string;
	number?: number;
	public?: boolean;
	prefix?: string;
	description?: string;
	status?: TaskStatusEnum;
	priority?: TaskPriorityEnum;
	size?: TaskSizeEnum;
	issueType?: TaskTypeEnum;
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
}

export interface ITasksStatistics extends ITask {
	duration?: number;
	durationPercentage?: number;
}
