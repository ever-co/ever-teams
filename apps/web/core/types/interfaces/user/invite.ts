import { EInviteStatus } from '../../generics/enums/invite';
import { ERoleName } from '../../generics/enums/role';
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
	/** Optional for Gauzy: it only prefills the name when the person accepts, and one value serves every address. */
	fullName?: string;
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
/** One invitation request for several people: Gauzy's `POST /invite/emails` takes a list of addresses. */
export interface IInviteRequest {
	emails: string[];
	teamId: string;
	organizationId: string;
	roleId?: string;
}

// Types for better security and performance
export interface InviteUserParams extends IInviteRequest {
	tenantId: string;
}

export interface TeamInvitationsQueryParams {
	tenantId: string;
	organizationId: string;
	role?: ERoleName;
	teamId: string;
}

export interface IGetInvitationRequest {
	roles?: string[];
	teamId?: string;
	status?: EInviteStatus;
}
