import { VERIFY_EMAIL_CALLBACK_URL, APP_NAME, APP_SIGNATURE, APP_LOGO_URL } from '@app/constants';
import { ISuccessResponse } from '@app/interfaces';
import { ILoginResponse, IRegisterDataRequest, ISigninEmailConfirmResponse } from '@app/interfaces/IAuthentication';
import { IUser } from '@app/interfaces/IUserData';
import { serverFetch } from '../fetch';
import qs from 'qs';

const registerDefaultValue = {
	appName: APP_NAME,
	appSignature: APP_SIGNATURE,
	appLogo: APP_LOGO_URL
};

export function registerUserRequest(data: IRegisterDataRequest) {
	const body = {
		...data,
		...registerDefaultValue,
		appEmailConfirmationUrl: VERIFY_EMAIL_CALLBACK_URL || data.appEmailConfirmationUrl
	};

	return serverFetch<IUser>({
		path: '/auth/register',
		method: 'POST',
		body
	});
}

export function sendAuthCodeRequest(email: string, callbackUrl: string) {
	return serverFetch<{ status: number; message: string | 'ok' }>({
		path: '/auth/send-code',
		method: 'POST',
		body: { email, callbackUrl }
	});
}

export function signInEmailRequest(email: string, callbackUrl: string) {
	return serverFetch<{ status: number; message: string | 'ok' }>({
		path: '/auth/signin.email',
		method: 'POST',
		body: { email, appMagicSignUrl: callbackUrl, appName: APP_NAME }
	});
}

export function signInEmailPasswordRequest(email: string, password: string) {
	return serverFetch<ISigninEmailConfirmResponse>({
		path: '/auth/signin.email.password',
		method: 'POST',
		body: { email, password, includeTeams: true }
	});
}

export function signWithSocialLoginsRequest(provider: string, oauthToken: string) {
	return serverFetch<ISigninEmailConfirmResponse>({
		path: '/auth/signin.email.social?includeTeams=true',
		method: 'POST',
		body: { provider, oauthToken }
	});
}

export const signInEmailConfirmRequest = (data: { code: string; email: string }) => {
	const { code, email } = data;

	return serverFetch<ISigninEmailConfirmResponse>({
		path: '/auth/signin.email/confirm',
		method: 'POST',
		body: { code, email, includeTeams: true }
	});
};

export function signInWorkspaceRequest(email: string, token: string) {
	return serverFetch<ILoginResponse>({
		path: '/auth/signin.workspace',
		method: 'POST',
		body: { email, token },
		bearer_token: token
	});
}

export function verifyAuthCodeRequest(email: string, code: string) {
	return serverFetch<ILoginResponse>({
		path: '/auth/verify-code',
		method: 'POST',
		body: { email, code }
	});
}

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

/**
 * Fetches details of the currently authenticated user, including specified relations.
 *
 * @param {IUEmployeeParam} employeeParams - The employee parameters, including bearer token and optional relations.
 * @returns A Promise resolving to the IUser object with the desired relations.
 */
export const currentAuthenticatedUserRequest = ({ bearer_token, relations = ['role', 'tenant'] }: IUEmployeeParam) => {
	// Construct the query string with 'qs', including the includeEmployee parameter
	const query = qs.stringify({
		relations: relations,
		includeEmployee: true // Append includeEmployee parameter set to true
	});

	// Construct and return the server fetch request
	return serverFetch<IUser>({
		path: `/user/me?${query}`,
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

export const verifyUserEmailByTokenRequest = (data: { token: string; email: string }) => {
	const { token, email } = data;

	return serverFetch<ISuccessResponse>({
		path: '/auth/email/verify',
		method: 'POST',
		body: { token, email }
	});
};

export const resentVerifyUserLinkRequest = (data: {
	bearer_token: string;
	email: string;
	tenantId: string;
	appEmailConfirmationUrl: string;
}) => {
	const { email, bearer_token, tenantId, appEmailConfirmationUrl } = data;

	const body = {
		email,
		tenantId,
		...registerDefaultValue,
		appEmailConfirmationUrl: VERIFY_EMAIL_CALLBACK_URL || appEmailConfirmationUrl
	};

	return serverFetch<ISuccessResponse>({
		path: '/auth/email/verify/resend-link',
		method: 'POST',
		body,
		tenantId: data.tenantId,
		bearer_token
	});
};
