import { ETaskStatusName } from '../../../generics/enums/task';
import { IBasePerTenantAndOrganizationEntityModel } from '../../common/base-interfaces';
import { IRelationalOrganizationProject } from '../../project/organization-project';
import { IRelationalOrganizationTeam } from '../../team/organization-team';
import { TaskStatusWorkFlow } from './task-status-workflow';

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
	template?: ETaskStatusName;
}
export interface ITaskStatusCreate extends Partial<Omit<ITaskStatus, 'is_system'>> {}
