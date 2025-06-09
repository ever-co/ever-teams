import { NullableGridSize } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import { ECurrencies } from '../../generics/enums/currency';
import { EProjectBudgetType, EProjectBilling, EProjectOwner, EProjectRelation } from '../../generics/enums/project';
import { ETaskListType, ETaskStatusName } from '../../generics/enums/task';
import { TTag } from '../../schemas';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { IRelationalImageAsset } from '../common/image-asset';
import { IEmployee } from '../organization/employee';
import { ICustomFieldsObject } from '../organization/organization';
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
	name?: string | null;
	startDate?: Date | null;
	endDate?: Date | null;
	billing?: EProjectBilling | null;
	currency?: ECurrencies | null;
	members?: IOrganizationProjectEmployee[];
	public?: boolean | null;
	owner?: EProjectOwner | null;
	tasks?: ITask[];
	teams?: IOrganizationTeam[];
	timeLogs?: ITimeLog[];
	// organizationSprints?: IOrganizationSprint[];
	// modules?: IOrganizationProjectModule[];
	taskListType?: ETaskListType | NullableGridSize;
	// payments?: IPayment[];
	code?: string | null;
	description?: string | null;
	color?: string | null;
	billable?: boolean | null;
	billingFlat?: boolean | null;
	openSource?: boolean | null;
	projectUrl?: string | null;
	openSourceProjectUrl?: string | null;
	budget?: number | null;
	budgetType?: EProjectBudgetType | null;
	membersCount?: number | null;
	imageUrl?: string | null;
	status?: ETaskStatusName | null;
	icon?: string | null;
	archiveTasksIn?: number | null;
	closeTasksIn?: number | null;
	defaultAssigneeId?: ID | null;
	defaultAssignee?: IEmployee | null;
	// Will be implemented on the  API side much later :
	relations?: IProjectRelation[] | null; // relationship
	repository?: IOrganizationProjectRepository | null;
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
	customFields?: ICustomFieldsObject;
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
	tags?: TTag[];
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
	owner: string | null;
	integrationId: string;
}
