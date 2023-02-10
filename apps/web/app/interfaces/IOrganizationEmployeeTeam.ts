import { IEmployee } from './IEmployee';

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

export interface IOrganizationTeamMember {
	id: string;
	createdAt: string;
	updatedAt: string;
	employee: IEmployee;
	employeeId: string;
	organizationId: string;
	organizationTeamId: string;
	role: IRole;
	roleId: string;
	tenantId: string;
	userId?: string;
	name?: string;
	title?: string;
}

export interface IRole {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
}
