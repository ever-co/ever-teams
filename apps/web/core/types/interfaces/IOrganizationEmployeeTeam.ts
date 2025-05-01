import { IEmployee } from './IEmployee';

export interface IOrganizationTeamEmployeeCreate {
	name?: string;
	organizationId?: string;
	organizationTeamId?: string;
	tenantId?: string;
	employeeId?: string;
	roleId?: string;
	isTrackingEnabled?: boolean;
	activeTaskId?: string;
	order?: number;
}
export interface IOrganizationTeamEmployeeUpdate extends IOrganizationTeamEmployeeCreate {
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

interface IRole {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
}
