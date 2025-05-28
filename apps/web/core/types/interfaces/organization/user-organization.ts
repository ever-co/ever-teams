import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IUser } from '../user/IUser';

export interface IBaseUserOrganization extends IBasePerTenantAndOrganizationEntityModel {
	userId?: ID;
	isDefault: boolean;
}

// Extend the base interface for specific use cases
export interface IUserOrganization extends IBaseUserOrganization {
	user?: IUser;
}
