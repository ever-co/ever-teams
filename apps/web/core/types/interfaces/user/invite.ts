import { EInviteStatus } from '../../generics/enums/invite';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../common/base-interfaces';
import { IOrganizationProject } from '../project/organization-project';
import { IRelationalRole } from '../role/role';
import { IOrganizationTeam } from '../team/organization-team';
import { IRelationalUser } from './user';

import { TUser } from '@/core/types/schemas';

interface IInviteBase extends IBasePerTenantAndOrganizationEntityModel {
	email: string;
	token: string;
	code?: string;
	status: EInviteStatus;
	expireDate: Date;
	actionDate?: Date;
	fullName?: string;
	isExpired?: boolean;
}

interface IInviteAssociations extends IRelationalUser, IRelationalRole {
	projects?: IOrganizationProject[];
	teams?: IOrganizationTeam[];
	// organizationContacts?: IOrganizationContact[];
	// departments?: IOrganizationDepartment[];
}

export interface IInvite extends IInviteBase, IInviteAssociations {
	invitedByUser?: TUser;
	invitedByUserId?: ID;
}
export interface IInviteCreate {
	emailIds: string[];
	projectIds: any[];
	departmentIds: any[];
	organizationContactIds: any[];
	teamIds: any[];
	inviteType: 'TEAM';
	appliedDate?: null;
	invitationExpirationPeriod: 'Never' | number;
	roleId: string;
	organizationId: string;
	fullName: string;
	callbackUrl?: string;
	startedWorkOn: string;
}

export type IInviteVerifyCode = {
	email: string;
	code: string;
};

export interface IInviteVerified {
	id: string;
	email: string;
	fullName: string;
	organization: {
		name: string;
	};
	isExpired: boolean;
}
export interface IInviteRequest {
	email: string;
	name: string;
	teamId: string;
	organizationId: string;
}

// Types for better security and performance
export interface InviteUserParams extends IInviteRequest {
	tenantId: string;
}

export interface TeamInvitationsQueryParams {
	tenantId: string;
	organizationId: string;
	role: string;
	teamId: string;
}
