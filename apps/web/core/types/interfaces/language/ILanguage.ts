import { IBasePerTenantAndOrganizationEntityModel } from '../base-interfaces';

export interface ILanguage extends IBasePerTenantAndOrganizationEntityModel {
	name?: string;
	code?: string;
	is_system?: boolean;
	description?: string;
	color?: string;
	isSelected?: boolean;
}
//export language list interface

export interface ILanguageItemList {
	id: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	name: string;
	is_system?: boolean;
	description: string;
	color: string;
	items: [];
	data: any;
}
