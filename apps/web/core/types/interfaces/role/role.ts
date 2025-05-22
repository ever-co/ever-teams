import { IBasePerTenantEntityModel } from '../base-interfaces';
import { IRolePermission } from './permission';

export interface IRole extends IBasePerTenantEntityModel {
	name: string;
	isSystem?: boolean;
	rolePermissions?: IRolePermission[];
}

export interface IRelationalRole {
	readonly role?: IRole;
	readonly roleId?: IRole['id'];
}
