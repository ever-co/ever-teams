/* eslint-disable camelcase */
import {
	IEmailAndCodeConfirmResponse,
	IRegisterDataRequest,
	ISuccessResponse,
	ISignInResponse,
	ILoginResponse
} from '../../interfaces/IAuthentication';
import { IUser } from '../../interfaces/IUserData';
import { serverFetch } from '../fetch';

const registerDefaultValue = {
	appName: 'Ever Teams',
	appSignature: 'Ever Team',
	appLogo: 'https://app.ever.team/assets/gauzy-team.png',
	appLink: 'https://ever.team/',
	appEmailConfirmationUrl: 'https://app.gauzy.co/#/auth/confirm-email'
};

export const registerUserRequest = (data: IRegisterDataRequest) => {
	const body = {
		...data,
		...registerDefaultValue
	};

	return serverFetch<IUser>({
		path: '/auth/register',
		method: 'POST',
		body
	});
};

export const loginUserRequest = (email: string, password: string) => {
	return serverFetch<ILoginResponse>({
		path: '/auth/login',
		method: 'POST',
		body: {
			email,
			password
		}
	});
};

export const whetherUserAuthenticatedRequest = (bearer_token: string) => {
	return serverFetch<boolean>({
		path: '/user/authenticated',
		method: 'GET',
		bearer_token
	});
};

type IUEmployeeParam = {
	bearer_token: string;
	relations?: string[];
};

export const currentAuthenticatedUserRequest = ({
	bearer_token,
	relations = ['employee', 'role', 'tenant']
}: IUEmployeeParam) => {
	const params = {} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const query = new URLSearchParams(params);

	return serverFetch<IUser>({
		path: `/user/me?${query.toString()}`,
		method: 'GET',
		bearer_token
	});
};

export const refreshTokenRequest = (refresh_token: string) => {
	return serverFetch<{ token: string }>({
		path: '/auth/refresh-token',
		method: 'POST',
		body: {
			refresh_token
		}
	});
};
// auth/signin.email
export function sendAuthCodeRequest(email: string) {
	return serverFetch<{ status: number; message: string | 'ok' }>({
		path: '/auth/signin.email',
		method: 'POST',
		body: { email }
	});
}

// auth/signin.email/confirm Gives response with tenantId's
export function verifyAuthCodeRequest(email: string, code: string) {
	return serverFetch<IEmailAndCodeConfirmResponse>({
		path: '/auth/signin.email/confirm?includeTeams=true',
		method: 'POST',
		body: { email, code }
	});
}

// auth/signin.workspace  Need the email and the token from auth/signin.email/confirm

export const signInWorkspaceRequest = (email: string, token: string) => {
	return serverFetch<ISignInResponse>({
		path: '/auth/signin.workspace',
		method: 'POST',
		body: { email, token }
	});
};

export const verifyUserEmailByCodeRequest = (data: {
	bearer_token: string;
	code: string;
	email: string;
	tenantId: string;
}) => {
	const { code, email, bearer_token, tenantId } = data;
	return serverFetch<ISuccessResponse>({
		path: '/auth/email/verify/code',
		method: 'POST',
		body: { code, email, tenantId },
		tenantId: data.tenantId,
		bearer_token
	});
};

export const resentVerifyUserLinkRequest = (data: { bearer_token: string; email: string; tenantId: string }) => {
	const { email, bearer_token, tenantId } = data;

	return serverFetch<ISuccessResponse>({
		path: '/auth/email/verify/resend-link',
		method: 'POST',
		body: { email, tenantId },
		tenantId: data.tenantId,
		bearer_token
	});
};
