import { IBasePerTenantAndOrganizationEntityModel } from '../common/base-interfaces';
import { ILanguage } from '../language/language';

export interface IOrganizationLanguage extends IBasePerTenantAndOrganizationEntityModel {
	language: ILanguage;
	languageCode: string;
	level: string;
	name: string;
}
