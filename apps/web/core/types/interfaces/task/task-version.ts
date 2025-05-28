import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalOrganizationProject } from '../project/organization-project';
import { IRelationalOrganizationTeam } from '../team/organization-team';

export interface ITaskVersion
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalOrganizationTeam {
	name: string;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isSystem?: boolean;
	fullIconUrl?: string;
}

export interface ITaskVersionCreate {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
	value?: string;
}
