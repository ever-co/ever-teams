export interface IRolePermissions {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	tenantId: string;
	permission: string;
	enabled: boolean;
	roleId: string;
	description: string;
}
