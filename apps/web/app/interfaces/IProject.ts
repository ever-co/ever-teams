import { IEmployee } from './IEmployee';
import { IOrganizationTeam } from './IOrganizationTeam';
import { ITeamTask } from './ITask';
import { TaskStatusEnum } from './ITaskStatus';
import { ITimeLog } from './timer/ITimerLogs';

export interface IProjectRepository {
	id: string;
	createdAt?: string;
	updatedAt?: string;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
	repositoryId: number;
	name: string;
	fullName: string;
	owner: string;
	integrationId: string;
}

export interface IProject {
	repositoryId?: number;
	repository?: IProjectRepository;
	name?: string;
	startDate?: Date;
	endDate?: Date;
	billing?: ProjectBillingEnum;
	currency?: string;
	members?: IEmployee[];
	public?: boolean;
	owner?: ProjectOwnerEnum;
	tasks?: ITeamTask[];
	teams?: IOrganizationTeam[];
	timeLogs?: ITimeLog[];
	code?: string;
	description?: string;
	color?: string;
	billable?: boolean;
	billingFlat?: boolean;
	openSource?: boolean;
	projectUrl?: string;
	openSourceProjectUrl?: string;
	budget?: number;
	membersCount?: number;
	imageUrl?: string;
	status?: TaskStatusEnum;
	icon?: string;
	archiveTasksIn?: number;
	closeTasksIn?: number;
	defaultAssigneeId?: string;
	defaultAssignee?: IEmployee;
	isTasksAutoSync?: boolean;
	isTasksAutoSyncOnLabel?: boolean;
	syncTag?: string;
	organizationContactId?: string;
	imageId?: string | null;
	organizationId?: string;
	tenantId?: string;
	id?: string;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
	isActive?: boolean;
	isArchived?: boolean;
	archivedAt?: Date;
	deletedAt?: Date;
}

export interface CustomFields {
	repositoryId: any;
}

export interface IProjectCreate {
	name: string;
	organizationId: string;
	tenantId: string;
}

export enum ProjectBillingEnum {
	RATE = 'RATE',
	FLAT_FEE = 'FLAT_FEE',
	MILESTONES = 'MILESTONES'
}

export enum ProjectOwnerEnum {
	CLIENT = 'CLIENT',
	INTERNAL = 'INTERNAL'
}
