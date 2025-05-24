import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { ILanguage } from '../language/ILanguage';

export interface IOrganizationLanguage extends IBasePerTenantAndOrganizationEntityModel {
	language: ILanguage;
	languageCode: string;
	level: string;
	name: string;
}
