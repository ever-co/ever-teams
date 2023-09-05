import { ITeamProps, IUser } from './IUserData';

export interface ILoginResponse {
	user: IUser;
	token: string;
	refresh_token: string;
}

export interface IRegisterDataRequest {
	user: Required<Pick<IUser, 'email' | 'firstName' | 'lastName' | 'timeZone'>>;
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
	confirmed_email: string;
	show_popup: boolean;
	workspaces: ISigninEmailConfirmWorkspaces[];
}
