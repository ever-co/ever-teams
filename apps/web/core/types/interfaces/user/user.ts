import { ETimeFormat } from '../enums/date';
import { IBasePerTenantEntityModel, ID } from '../common/base-interfaces';
import { IRole } from '../role/role';
import { IOrganizationTeam } from '../team/organization-team';
import { IOrganization } from '../organization/organization';
import { ITag } from '../tag/tag';
import { ISocialAccount } from './social-account';
import { IUserOrganization } from '../organization/user-organization';
import { IEmployee } from '../organization/employee';
import { IInvite } from './invite';
import { IRelationalImageAsset } from '../common/image-asset';

export interface IUser extends IBasePerTenantEntityModel, IRelationalImageAsset {
	thirdPartyId?: ID;
	name?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phoneNumber?: string;
	username?: string;
	timeZone?: string;
	timeFormat?: ETimeFormat;
	role?: IRole;
	roleId?: ID;
	hash?: string;
	imageUrl?: string;
	employee?: IEmployee;
	employeeId?: ID;
	// candidate?: ICandidate;
	candidateId?: ID;
	defaultTeam?: IOrganizationTeam;
	defaultTeamId?: ID;
	lastTeam?: IOrganizationTeam;
	lastTeamId?: ID;
	defaultOrganization?: IOrganization;
	defaultOrganizationId?: ID;
	lastOrganization?: IOrganization;
	lastOrganizationId?: ID;
	tags?: ITag[];
	preferredLanguage?: string;
	// payments?: IPayment[];
	// preferredComponentLayout?: ComponentLayoutStyleEnum;
	fullName?: string;
	organizations?: IUserOrganization[];
	isImporting?: boolean;
	sourceId?: ID;
	code?: string;
	codeExpireAt?: Date;
	emailVerifiedAt?: Date;
	lastLoginAt?: Date;
	isEmailVerified?: boolean;
	emailToken?: string;
	invites?: IInvite[];
	socialAccounts?: ISocialAccount[];
}

/**
 * Entities that have relation with the User entity will extends this
 */
export interface IRelationalUser {
	user?: IUser;
	userId?: ID;
}
