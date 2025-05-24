import { TimeFormatEnum } from '../../enums/date';
import { IBasePerTenantEntityModel, ID } from '../global/base-interfaces';
import { IRole } from '../role/IRole';
import { IOrganizationTeam } from '../team/IOrganizationTeam';
import { IOrganization } from '../organization/IOrganization';
import { ITag } from '../tag/ITag';
import { ISocialAccount } from './ISocialAccount';
import { IUserOrganization } from '../organization/IUserOrganization';
import { IEmployee } from '../organization/employee/IEmployee';
import { IRelationalImageAsset } from '../image-asset/IImageAsset';
import { IInvite } from './IInvite';

export interface IUser extends IBasePerTenantEntityModel, IRelationalImageAsset {
	thirdPartyId?: ID;
	name?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phoneNumber?: string;
	username?: string;
	timeZone?: string;
	timeFormat?: TimeFormatEnum;
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
