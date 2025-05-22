import { CurrenciesEnum } from '../../enums/currency';
import { OrganizationProjectBudgetTypeEnum, ProjectBillingEnum, ProjectOwnerEnum } from '../../enums/project';
import { TaskListTypeEnum, TaskStatusEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../base-interfaces';
import { IRelationalImageAsset } from '../image-asset/IImageAsset';
import { IEmployee } from '../organization/employee/IEmployee';
import { CustomFieldsObject } from '../organization/IOrganization';
import { ITask } from '../tasks/ITask';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { ITimeLog } from '../timelog/ITimeLog';
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
	status?: TaskStatusEnum;
	icon?: string;
	archiveTasksIn?: number;
	closeTasksIn?: number;
	defaultAssigneeId?: ID;
	defaultAssignee?: IEmployee;
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
