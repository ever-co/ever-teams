/** A permission of a role, as the API lists them for the signed-in user. */
export interface IRolePermission {
	id: string;
	roleId: string;
	permission: string;
	enabled: boolean;
}
