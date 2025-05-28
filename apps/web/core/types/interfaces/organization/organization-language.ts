import { IBasePerTenantAndOrganizationEntityModel } from '../common/base-interfaces';
import { ILanguage } from '../common/language';

export interface IOrganizationLanguage extends IBasePerTenantAndOrganizationEntityModel {
	language: ILanguage;
	languageCode: string;
	level: string;
	name: string;
}
