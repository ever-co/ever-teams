import { IBasePerTenantEntityModel, ID } from '../common/base-interfaces';
import { IRole } from './role';

export interface IRolePermission extends IBasePerTenantEntityModel {
	role: IRole;
	roleId: ID;
	permission: string;
	enabled: boolean;
	description: string;
}
