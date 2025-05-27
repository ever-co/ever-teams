import { ETaskIssueType } from '../enums/task';
import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { IRelationalImageAsset } from '../global/IImageAsset';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';

export interface IIssueType
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IRelationalOrganizationProject,
		IRelationalImageAsset {
	name: ETaskIssueType;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isDefault?: boolean;
	isSystem?: boolean;
	fullIconUrl?: string;
}
export interface IIssueTypesCreate {
	name: ETaskIssueType;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
	isDefault?: boolean;
}
