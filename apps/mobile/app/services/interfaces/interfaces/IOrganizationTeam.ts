import { IEmployee } from './IEmployee';

export interface IOrganizationTeamCreate {
	name: string;
	memberIds?: any[];
	managerIds?: any[];
	tags?: any[];
	organizationId: string;
	tenantId: string;
}

export interface IOrganizationTeam {
	tenantId: string;
	organizationId: string;
	name: string;
	tenant: {
		id: string;
	};
	members: any[];
	tags: any[];
	id: string;
	createdAt: string;
	updatedAt: string;
}

export interface IOrganizationTeamList {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name: string;
	updated?: boolean;
	members: OT_Member[];
}

export type IOrganizationTeamWithMStatus = Omit<IOrganizationTeamList, 'members'> & {
	members: MS_Member[];
};

type MS_Member = Omit<OT_Member, 'role' | 'employee'>;

interface OT_Member {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: any;
	organizationId: any;
	organizationTeamId: string;
	employeeId: string;
	roleId?: string;
	role?: OT_Role;
	employee: IEmployee;
	lastWorkedTask?: any;
	running?: boolean;
	duration?: number;
	activeTaskId?: string;
}

interface OT_Role {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
}
