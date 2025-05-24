import { InviteStatusEnum } from '../../enums/invite';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IOrganizationProject } from '../project/IOrganizationProject';
import { IRelationalRole } from '../role/IRole';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { IRelationalUser, IUser } from './IUser';

interface IInviteBase extends IBasePerTenantAndOrganizationEntityModel {
	email: string;
	token: string;
	code?: string;
	status: InviteStatusEnum;
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
	invitedByUser?: IUser;
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
export type IInviteRequest = {
	name: string;
	email: string;
};

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
