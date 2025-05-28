import { ECurrencies } from '../enums/currency';
import { EProjectBudgetType, EProjectBilling, EProjectOwner, EProjectRelation } from '../enums/project';
import { ETaskListType, ETaskStatusName } from '../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../global/base-interfaces';
import { IRelationalImageAsset } from '../global/image-asset';
import { IEmployee } from '../organization/employee';
import { CustomFieldsObject } from '../organization/organization';
import { ITag } from '../tag/tag';
import { ITask } from '../task/task';
import { IOrganizationTeam } from '../team/organization-team';
import { ITimeLog } from '../timer/time-log/time-log';
import { IOrganizationProjectEmployee } from './organization-project-employee';

export interface IOrganizationProjectBase
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalImageAsset,
		// IRelationalOrganizationContact,
		IOrganizationProjectSetting,
		ITaggable {
	name?: string;
	startDate?: Date;
	endDate?: Date;
	billing?: EProjectBilling;
	currency?: ECurrencies;
	members?: IOrganizationProjectEmployee[];
	public?: boolean;
	owner?: EProjectOwner;
	tasks?: ITask[];
	teams?: IOrganizationTeam[];
	timeLogs?: ITimeLog[];
	// organizationSprints?: IOrganizationSprint[];
	// modules?: IOrganizationProjectModule[];
	taskListType?: ETaskListType;
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
	budgetType?: EProjectBudgetType;
	membersCount?: number;
	imageUrl?: string;
	status?: ETaskStatusName;
	icon?: string;
	archiveTasksIn?: number;
	closeTasksIn?: number;
	defaultAssigneeId?: ID;
	defaultAssignee?: IEmployee;
	// Will be implemented on the  API side much later :
	relations?: IProjectRelation[]; // relationship
	repository?: IOrganizationProjectRepository;
}

export interface IProjectRelation {
	projectId: string;
	relationType: EProjectRelation | null;
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
	budgetType?: EProjectBudgetType;
	startDate: string;
	endDate: string;
	archivedAt: string | null;
	billing?: EProjectBilling;
	currency?: string;
	memberIds?: string[];
	managerIds?: string[];
	teams?: IOrganizationTeam[];
	status?: ETaskStatusName;
	isActive?: boolean;
	isArchived?: boolean;
	isTasksAutoSync?: boolean;
	isTasksAutoSyncOnLabel?: boolean;
	owner?: EProjectOwner;
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
