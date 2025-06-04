import { IBasePerTenantAndOrganizationEntityModel, ID } from '../common/base-interfaces';
import { IUser } from '../user/user';

export interface IBaseUserOrganization extends IBasePerTenantAndOrganizationEntityModel {
	userId?: ID;
	isDefault: boolean;
}

// Extend the base interface for specific use cases
export interface IUserOrganization extends IBaseUserOrganization {
	user?: IUser;
}
