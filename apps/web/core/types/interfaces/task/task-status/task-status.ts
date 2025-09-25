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
	description?: string | null;
	icon?: string | null;
	color?: string | null;
	order?: number | null;
	isSystem?: boolean | null;
	isCollapsed?: boolean | null;
	isDefault?: boolean | null;
	fullIconUrl?: string | null;
	template?: ETaskStatusName | null;
}
export interface ITaskStatusCreate extends Partial<Omit<ITaskStatus, 'is_system'>> {}
