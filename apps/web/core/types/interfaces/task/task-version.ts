import { IBasePerTenantAndOrganizationEntityModel } from '../common/base-interfaces';
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

export interface ITaskVersionCreateRequest extends Omit<ITaskVersion, 'isSystem'>, Omit<ITaskVersion, 'value'> {}

export interface ITaskVersionUpdateRequest extends Partial<ITaskVersionCreateRequest> {
	id?: string;
}

export interface IGetTaskVersionsRequest
	extends IBasePerTenantAndOrganizationEntityModel,
		Pick<ITaskVersion, 'projectId' | 'organizationTeamId'> {}
