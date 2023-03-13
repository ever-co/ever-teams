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
