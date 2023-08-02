import { IEmployee } from './IEmployee';
import { IOrganizationTeamList } from './IOrganizationTeam';

export type ITeamTask = {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	number: number;
	prefix: string;
	title: string;
	description: string;
	estimate: null | number;
	totalWorkedTime?: number;
	estimateDays?: number;
	estimateHours?: number;
	estimateMinutes?: number;
	dueDate: string;
	startDate?: string | null;
	projectId: string;
	public: boolean;
	resolvedAt?: string;
	creatorId: string;
	members: IEmployee[];
	selectedTeam?: IOrganizationTeamList;
	tags: Tag[];
	teams: SelectedTeam[];
	linkedIssues?: {
		id: string;
		createdAt: string;
		updatedAt: string;
		tenantId: string;
		organizationId: string;
		action: number;
		taskFromId: string;
		taskToId: string;
		taskTo: Omit<ITeamTask, 'linkedIssues'>;
		taskFrom: Omit<ITeamTask, 'linkedIssues'>;
	}[];
	creator: Creator;
	taskNumber: string;
	label?: string;
	parentId?: string;
} & ITaskStatusStack;

type SelectedTeam = Pick<
	IOrganizationTeamList,
	| 'id'
	| 'createdAt'
	| 'name'
	| 'organizationId'
	| 'tenantId'
	| 'updatedAt'
	| 'prefix'
	| 'image'
	| 'imageId'
>;

export interface Tag {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name: string;
	description: string;
	color: string;
	isSystem: boolean;
}

interface Creator {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	thirdPartyId: any;
	firstName: string;
	lastName: string;
	email: string;
	username: any;
	hash: string;
	refreshToken: any;
	imageUrl: string;
	preferredLanguage: string;
	preferredComponentLayout: string;
	isActive: boolean;
	roleId: string;
	name: string;
	employeeId: any;
}

export type ITaskPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export type IVersionProperty = string;

export type IEpicProperty = string;

export type ITaskSize = 'X-Large' | 'Large' | 'Medium' | 'Small' | 'Tiny';

export type ITaskLabel = 'UI/UX' | 'Mobile' | 'WEB' | 'Tablet';

export type ITaskStatus =
	| 'blocked'
	| 'ready'
	| 'backlog'
	| 'todo'
	| 'in progress'
	| 'completed'
	| 'closed'
	| 'in review'
	| 'open';

export type ITaskIssue = 'Bug' | 'Task' | 'Story' | 'Epic';

export type ITaskStatusField =
	| 'status'
	| 'size'
	| 'priority'
	| 'label'
	| 'issueType'
	| 'version'
	| 'epic'
	| 'project'
	| 'team'
	| 'tags';

export type ITaskStatusStack = {
	status: ITaskStatus;
	size: ITaskSize;
	label: ITaskLabel;
	priority: ITaskPriority;
	issueType: ITaskIssue;
	version: IVersionProperty;
	epic: IEpicProperty;
	project: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	team: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	tags: any; //TODO: these types are not strings, but rather array of objects for tags. To reimplement
};

export interface ICreateTask {
	title: string;
	status: ITaskStatus;
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
}

export interface ITaskLinkedIssue {
	organizationId: string;
	taskToId: string;
	taskFromId: string;
	action: number;
}

export interface ITaskLinkedIssueResponse {
	tenantId: string;
	organizationId: string;
	action: number;
	taskFromId: string;
	taskToId: string;
	tenant: { id: string };
	id: string;
	createdAt: string;
	updatedAt: string;
}

export enum TaskRelatedIssuesRelationEnum {
	IS_BLOCKED_BY = 1,
	BLOCKS = 2,
	IS_CLONED_BY = 3,
	CLONES = 4,
	IS_DUPLICATED_BY = 5,
	DUPLICATES = 6,
	RELATES_TO = 7,
}
