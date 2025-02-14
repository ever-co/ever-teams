import { IEmployee } from './IEmployee';
import { IOrganizationTeam, OT_Member } from './IOrganizationTeam';
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
	members?: OT_Member[];
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
	budgetType?: OrganizationProjectBudgetTypeEnum;
	membersCount?: number;
	imageUrl: string | null;
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
	organizationId: string;
	tenantId: string;
	id: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	isActive?: boolean;
	isArchived?: boolean;
	archivedAt: string | null;
	deletedAt: string | null;
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

export enum OrganizationProjectBudgetTypeEnum {
	HOURS = 'hours',
	COST = 'cost'
}
