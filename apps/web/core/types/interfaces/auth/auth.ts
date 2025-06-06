import { ID } from '../common/base-interfaces';
import { IOrganizationTeam } from '../team/organization-team';

import { TUser } from '@/core/types/schemas';

export interface IUserSigninWorkspaceResponse {
	confirmed_email: string;
	show_popup: boolean;
	total_workspaces: number;
	defaultTeamId?: ID;
	defaultOrganizationId?: ID;
	lastTeamId?: ID;
	lastOrganizationId?: ID;
	workspaces: ISigninEmailConfirmWorkspaces[];
	status?: number;
	user: TUser;
}
export interface IAuthResponse {
	team: TUser;
	user: TUser;
	token: string;
	refresh_token: string;
}
export interface ITeamProps {
	email: string;
	name: string;
	team: string;
	recaptcha?: string;
}

export interface ISigninWorkspaceInput {
	email: string;
	token: string;
	defaultTeamId?: IOrganizationTeam['id'];
	lastTeamId?: IOrganizationTeam['id'];
}

export interface IRegisterDataRequest {
	user: Required<Pick<TUser, 'email' | 'firstName' | 'lastName' | 'timeZone'>>;
	password: string;
	confirmPassword: string;
	appEmailConfirmationUrl?: string;
	appName?: string;
	appLogo?: string;
	appSignature?: string;
	appLink?: string;
}

export interface IDecodedRefreshToken {
	id: string;
	email: string;
	tenantId: any;
	role: any;
	iat: number;
	exp: number;
}

export type IRegisterDataAPI = ITeamProps & {
	timezone?: string;
} & { [x: string]: string };

export interface ILoginDataAPI {
	email: string;
	code: string;
}

export interface ISigninEmailConfirmWorkspaces {
	token: string;
	user: {
		email: string;
		imageUrl: string;
		lastTeamId?: string;
		lastLoginAt?: string;
		name: string;
		tenant: { name: string; logo: string };
	};
	current_teams: {
		team_id: string;
		team_name: string;
		team_logo: string;
		team_member_count: string;
		profile_link: string;
		prefix: string | null;
	}[];
}
export interface ISigninEmailConfirmResponse {
	user: TUser;
	confirmed_email: string;
	show_popup: boolean;
	workspaces: ISigninEmailConfirmWorkspaces[];
	status?: number;
	defaultTeamId?: string;
}

export interface IMeetAuthRequest {
	room?: string;
	tenant?: string;
}
