import { IBasePerTenantAndOrganizationEntityModel } from '../base-interfaces';
import { IRelationalImageAsset } from '../image-asset/IImageAsset';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';

export interface IIssueType
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IRelationalOrganizationProject,
		IRelationalImageAsset {
	name: string;
	value: string;
	description?: string;
	icon?: string;
	color?: string;
	isDefault?: boolean;
	isSystem?: boolean;
	fullIconUrl?: string;
}
