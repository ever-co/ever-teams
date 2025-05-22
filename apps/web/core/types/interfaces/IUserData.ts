import { IEmployee } from './IEmployee';
import { IImageAssets } from './IImageAssets';
import { IOrganization } from './IOrganization';
import { IOrganizationTeam } from './IOrganizationTeam';

export interface ITeamProps {
	email: string;
	name: string;
	team: string;
	recaptcha?: string;
}

export interface ITokens {
	token: string;
}

export interface IEmail {
	email: string;
}
export interface ICode {
	code: string;
}

export interface IUserData {
	id?: string;
	token: string;
	email: string;
	firstName: string;
	lastName?: string;
	imageUrl?: string;
	username?: string;
	isActive?: boolean;
}

//export language list interface
export interface ILanguageItemList {
	id: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	name: string;
	is_system?: boolean;
	description: string;
	color: string;
	items: [];
	data: any;
}

export interface IRoleList {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isSystem: boolean;
	items: [];
	data: any;
}

//export timezone list interface
export interface ITimezoneItemList {
	length: number | undefined;
	id: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	name: string;
	is_system?: boolean;
	description: string;
	color: string;
	items: [];
	title: string;
}

export interface IRelationalUser {
	user?: IUser;
	userId?: IUser['id'];
}
