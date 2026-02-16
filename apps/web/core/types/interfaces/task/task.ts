import { ETaskPriority, ETaskSize, ETaskStatusName, EIssueType } from '../../generics/enums/task';
import { TTask } from '../../schemas/task/task.schema';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { IEmployee } from '../organization/employee';
import { IRelationalOrganizationProject } from '../project/organization-project';
import { IOrganizationTeam } from '../team/organization-team';
import { IIssueType } from './issue-type';
import { ITaskLinkedIssue } from './task-linked-issue';
import { ITaskPriority } from './task-priority';
import { ITaskSize } from './task-size';
import { ITaskStatus } from './task-status/task-status';
import { TTaskStatus } from '../../schemas';

export interface IBaseTaskProperties extends IBasePerTenantAndOrganizationEntityModel {
	title: string;
	number?: number;
	public?: boolean;
	prefix?: string;
	description?: string;
	status?: ETaskStatusName;
	priority?: ETaskPriority;
	size?: ETaskSize;
	issueType?: EIssueType;
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

/** Filter criteria passed to applyAllFilters */
export interface KanbanFilterCriteria {
	search: string;
	priority: string[];
	issueValue: string | undefined;
	sizes: string[];
	labels: string[];
	epics: string[];
	employee: string | null;
}

/**
 * Props for KanbanView — all data & operations received from parent.
 * No internal hook calls → pure prop-driven component.
 */
export interface KanbanViewProps {
	/** Board data: tasks grouped by status column name */
	kanbanBoardTasks: IKanban;
	/** Whether board data is still loading */
	isLoading: boolean;
	/** Task status columns with optimistic state applied */
	kanbanColumns: TTaskStatus[];
	/** All task statuses (for status ID lookup during drag/drop) */
	taskStatuses: TTaskStatus[];
	/** Setter to update the board after drag/drop operations */
	updateKanbanBoard: (board: IKanban | ((prev: IKanban) => IKanban)) => void;
	/** API call to update a task's status on the server */
	updateTaskStatus: (task: TTask) => void;
	/** Check if a column is collapsed */
	isColumnCollapse: (column: string) => boolean | undefined;
	/** API call to reorder a column */
	reorderStatus: (itemStatus: string, index: number) => Promise<void>;
	/** Add a new task to the board */
	addNewTask: (task: TTask, status: string) => void;
	/** Toggle column collapse/expand */
	toggleColumn: (column: string, status: boolean) => Promise<void>;
}

export interface IKanban {
	[key: string]: TTask[];
}
