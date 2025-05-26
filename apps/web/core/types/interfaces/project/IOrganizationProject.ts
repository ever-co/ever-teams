import { CurrenciesEnum } from '../../enums/currency';
import {
	OrganizationProjectBudgetTypeEnum,
	ProjectBillingEnum,
	ProjectOwnerEnum,
	ProjectRelationEnum
} from '../../enums/project';
import { TaskListTypeEnum, ITaskStatusNameEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../global/base-interfaces';
import { IRelationalImageAsset } from '../global/IImageAsset';
import { IEmployee } from '../organization/employee/IEmployee';
import { CustomFieldsObject } from '../organization/IOrganization';
import { ITag } from '../tag/ITag';
import { ITask } from '../task/ITask';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { ITimeLog } from '../time-log/ITimeLog';
import { IOrganizationProjectEmployee } from './IOrganizationProjectEmployee';

export interface IOrganizationProjectBase
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalImageAsset,
		// IRelationalOrganizationContact,
		IOrganizationProjectSetting,
		ITaggable {
	name?: string;
	startDate?: Date;
	endDate?: Date;
	billing?: ProjectBillingEnum;
	currency?: CurrenciesEnum;
	members?: IOrganizationProjectEmployee[];
	public?: boolean;
	owner?: ProjectOwnerEnum;
	tasks?: ITask[];
	teams?: IOrganizationTeam[];
	timeLogs?: ITimeLog[];
	// organizationSprints?: IOrganizationSprint[];
	// modules?: IOrganizationProjectModule[];
	taskListType?: TaskListTypeEnum;
	// payments?: IPayment[];
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
	imageUrl?: string;
	status?: ITaskStatusNameEnum;
	icon?: string;
	archiveTasksIn?: number;
	closeTasksIn?: number;
	defaultAssigneeId?: ID;
	defaultAssignee?: IEmployee;
	// Will be implemented on the  API side much later :
	relations?: IProjectRelation[]; // relationship
}

export interface IProjectRelation {
	projectId: string;
	relationType: ProjectRelationEnum | null;
}

export interface IRelationalOrganizationProject {
	project?: IOrganizationProject;
	projectId?: ID;
}

// Base interface with optional properties of organization project setting
export interface IOrganizationProjectSetting extends IBasePerTenantAndOrganizationEntityModel {
	customFields?: CustomFieldsObject;
	isTasksAutoSync?: boolean;
	isTasksAutoSyncOnLabel?: boolean;
	syncTag?: string;
}

export interface IOrganizationProject extends IOrganizationProjectBase {
	name: string; // Make sure these are required
}
export interface ICreateProjectRequest {
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
	teams?: IOrganizationTeam[];
	status?: ITaskStatusNameEnum;
	isActive?: boolean;
	isArchived?: boolean;
	isTasksAutoSync?: boolean;
	isTasksAutoSyncOnLabel?: boolean;
	owner?: ProjectOwnerEnum;
	// Will be implemented on the  API side much later :
	relations?: IProjectRelation[]; // relationship
}

export type IEditProjectRequest = Partial<ICreateProjectRequest>;

export interface IOrganizationProjectRepository {
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
