import { IBasePerTenantEntityModel } from '../global/base-interfaces';
import { IRolePermission } from './IRolePermission';

export interface IRole extends IBasePerTenantEntityModel {
	name: string;
	isSystem?: boolean;
	rolePermissions?: IRolePermission[];
}

export interface IRelationalRole {
	readonly role?: IRole;
	readonly roleId?: IRole['id'];
}
export interface IRoleList {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
	items: [];
	data: any;
}
