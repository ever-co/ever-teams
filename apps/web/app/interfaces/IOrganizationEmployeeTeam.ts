export interface IOrganizationTeamEmployeeCreate {
	name: string;
	memberIds?: any[];
	managerIds?: any[];
	tags?: any[];
	organizationId: string;
	tenantId: string;
}
export interface IOrganizationTeamEmployeeUpdate
	extends IOrganizationTeamEmployeeCreate {
	id: string;
}
