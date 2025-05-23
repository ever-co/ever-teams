import { IEmployee } from './IEmployee';
import { IOrganization } from './IOrganization';
import { IOrganizationTeam, IOrganizationTeamList, OT_Member } from './IOrganizationTeam';
import { ITeamTask } from './ITask';
import { TaskStatusEnum } from './ITaskStatus';
import { ITenant } from './ITenant';
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
	tags?: ITag[];
}

export interface CustomFields {
	repositoryId: any;
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

export interface ITag {
	id: string;
	name: string;
	color: string;
	textColor?: string;
	icon?: string;
	description?: string;
	isSystem?: boolean;
	tagTypeId?: string;
	organizationId?: string;
	organization?: IOrganization;
	tenantId?: string;
	tenant?: ITenant;
}

export interface ILabel {
	id: string;
	name: string;
	color: string;
	textColor?: string;
	icon?: string;
	description?: string;
	organizationId?: string;
	organization?: IOrganization;
	tenantId?: string;
	tenant?: ITenant;
}

export enum ProjectRelationEnum {
	RelatedTo = 'related to',
	BlockedBy = 'blocked by',
	Blocking = 'blocking'
}

export interface IProjectRelation {
	projectId: string;
	relationType: ProjectRelationEnum | null;
}

export interface ICreateProjectInput {
	name: string;
	organizationId: string;
	tenantId: string;
	projectUrl?: string;
	description?: string;
	color?: string;
	tags?: ITag[];
	imageUrl?: string;
	imageId?: string;
	budget?: number;
	budgetType?: OrganizationProjectBudgetTypeEnum;
	startDate: string;
	endDate: string;
	archivedAt: string | null;
	billing?: ProjectBillingEnum;
	currency?: string;
	memberIds?: string[];
	managerIds?: string[];
	teams?: IOrganizationTeamList[];
	status?: IProject['status'];
	isActive?: boolean;
	isArchived?: boolean;
	isTasksAutoSync?: boolean;
	isTasksAutoSyncOnLabel?: boolean;
	owner?: ProjectOwnerEnum;
	// Will be implemented on the  API side much later :
	relations?: IProjectRelation[]; // relationship
}

export type IEditProjectInput = Partial<ICreateProjectInput>;
