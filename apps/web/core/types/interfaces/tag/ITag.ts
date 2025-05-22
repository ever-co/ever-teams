import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../base-interfaces';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';

export interface ITag extends IBasePerTenantAndOrganizationEntityModel, IRelationalOrganizationTeam {
	name: string;
	color: string;
	textColor?: string;
	icon?: string;
	description?: string;
	isSystem?: boolean;
	tagTypeId?: ID;
	tagType?: ITagType;
}

export interface ITagType extends IBasePerTenantAndOrganizationEntityModel, ITaggable {
	type: string;
}
