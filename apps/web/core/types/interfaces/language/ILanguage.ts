import { IBasePerTenantAndOrganizationEntityModel } from '../base-interfaces';

export interface ILanguage extends IBasePerTenantAndOrganizationEntityModel {
	name?: string;
	code?: string;
	is_system?: boolean;
	description?: string;
	color?: string;
	isSelected?: boolean;
}
