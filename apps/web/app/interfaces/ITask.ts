import { IEmployee } from './IEmployee';
import { IOrganizationTeamList } from './IOrganizationTeam';

export interface ITeamTask {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	number: number;
	prefix: string;
	title: string;
	description: string;
	status: ITaskStatus;
	estimate: null | number;
	estimateDays?: number;
	estimateHours?: number;
	estimateMinutes?: number;
	dueDate: string;
	projectId: string;
	creatorId: string;
	members: IEmployee[];
	selectedTeam?: SelectedTeam;
	tags: Tag[];
	teams: SelectedTeam[];
	creator: Creator;
	taskNumber: string;
}

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

export type ITaskStatus =
	| 'Blocked'
	| 'Ready'
	| 'Backlog'
	| 'Todo'
	| 'In Progress'
	| 'Completed'
	| 'Closed'
	| 'In Review';

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
