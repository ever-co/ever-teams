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
	estimateDays?: number;
	estimateHours?: number;
	estimateMinutes?: number;
	dueDate: string;
	projectId: string;
	creatorId: string;
	members: IEmployee[];
	selectedTeam?: IOrganizationTeamList;
	tags: Tag[];
	teams: SelectedTeam[];
	creator: Creator;
	taskNumber: string;
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
>;

interface Tag {
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

export type ITaskProperty = 'Medium' | 'High' | 'Low' | 'Urgent';

export type ITaskSize = 'Extra Large' | 'Large' | 'Medium' | 'Small' | 'Tiny';

export type ITaskDevice = 'UI/UX' | 'Mobile' | 'WEB' | 'Tablet';

export type ITaskStatus =
	| 'Blocked'
	| 'Ready'
	| 'Backlog'
	| 'Todo'
	| 'In Progress'
	| 'Completed'
	| 'Closed'
	| 'In Review';

export type ITaskStatusField = 'status' | 'size' | 'property' | 'device';

export type ITaskStatusStack = {
	status: ITaskStatus;
	size: ITaskSize;
	device: ITaskDevice;
	property: ITaskProperty;
};

export interface ICreateTask {
	title: string;
	status: ITaskStatus;
	members?: [];
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
