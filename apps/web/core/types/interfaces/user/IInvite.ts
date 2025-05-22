import { InviteStatusEnum } from '../../enums/invite';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
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
