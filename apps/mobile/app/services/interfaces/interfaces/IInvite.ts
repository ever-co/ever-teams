import { IOrganizationTeam } from './IOrganizationTeam';

export interface IInviteCreate {
	emailIds: string[];
	projectIds?: string[];
	departmentIds?: string[];
	teamIds: string[];
	organizationContactIds?: string[];
	roleId: string;
	organizationId: string;
	tenantId: string;
	invitedById: string;
	inviteType: string;
	startedWorkOn: string;
	appliedDate?: any;
	invitationExpirationPeriod: string;
}

export interface IInvitation {
	token: string;
	email: string;
	roleId: string;
	organizationId: string;
	tenantId: string;
	invitedById: string;
	status: string;
	expireDate: any;
	projects: any[];
	teams: IOrganizationTeam[];
	departments: any[];
	organizationContacts: any[];
	actionDate: string;
	id: string;
	createdAt: string;
	updatedAt: string;
}

export type IInviteRequest = {
	name: string;
	email: string;
};
