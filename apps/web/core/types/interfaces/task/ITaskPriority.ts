import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';

export interface ITaskPriority
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IRelationalOrganizationProject {
	name: string;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isSystem?: boolean;
	fullIconUrl?: string;
}
export interface ITaskPrioritiesCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
}
