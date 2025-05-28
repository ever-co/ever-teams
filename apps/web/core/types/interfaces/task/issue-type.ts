import { EIssueType } from '../enums/task';
import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalImageAsset } from '../global/image-asset';
import { IRelationalOrganizationProject } from '../project/organization-project';
import { IRelationalOrganizationTeam } from '../team/organization-team';

export interface IIssueType
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IRelationalOrganizationProject,
		IRelationalImageAsset {
	name: EIssueType;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isDefault?: boolean;
	isSystem?: boolean;
	fullIconUrl?: string;
}
export interface IIssueTypesCreate {
	name: EIssueType;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
	isDefault?: boolean;
}
