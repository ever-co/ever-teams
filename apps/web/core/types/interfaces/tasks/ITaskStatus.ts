import { TaskStatusEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel } from '../base-interfaces';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';
import { TaskStatusWorkFlow } from './ITaskStatusWorkFlow';

export interface ITaskStatus
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IRelationalOrganizationProject,
		TaskStatusWorkFlow {
	name: string;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	order?: number;
	isSystem?: boolean;
	isCollapsed?: boolean;
	isDefault?: boolean;
	fullIconUrl?: string;
	template?: TaskStatusEnum;
}
