import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';

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
