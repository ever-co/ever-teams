import { getRefreshTokenCookie, getTenantIdCookie, setAccessTokenCookie } from '@app/helpers/cookies';
import { ISuccessResponse, IUser } from '@app/interfaces';
import { ILoginResponse, IRegisterDataAPI, ISigninEmailConfirmResponse } from '@app/interfaces/IAuthentication';
import api, { get, post } from '../axios';
import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL
} from '@app/constants';
import qs from 'qs';
import { signInEmailConfirmGauzy, signInWorkspaceGauzy } from './auth/invite-accept';

export const getAuthenticatedUserDataAPI = () => {
	const params = {} as { [x: string]: string };
	const relations = ['employee', 'role', 'tenant'];

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const query = qs.stringify(params);

	return get<IUser>(`/user/me?${query}`);
};

export async function refreshTokenAPI() {
	const refresh_token = getRefreshTokenCookie();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		const { data } = await post<{ token: string }>('/auth/refresh-token', {
			refresh_token
		});

		setAccessTokenCookie(data.token);

		return getAuthenticatedUserDataAPI();
	}

	return api.post<ILoginResponse>(`/auth/refresh`, {
		refresh_token
	});
}

export const signInWithEmailAndCodeAPI = (email: string, code: string) => {
	return api.post<ILoginResponse>(`/auth/login`, {
		email,
		code
	});
};

export const sendAuthCodeAPI = (email: string) => {
	const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;

	return post<{ status: number; message: string }>(`/auth/send-code`, {
		email,
		callbackUrl
	});
};

export const verifyUserEmailByCodeAPI = (code: string, email: string) => {
	const tenantId = getTenantIdCookie();
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/code' : `/auth/verify/code`;

	return post<ISuccessResponse>(endpoint, { code, tenantId, email });
};

export const resentVerifyUserLinkAPI = (user: IUser) => {
	const appEmailConfirmationUrl = `${location.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;
	const registerDefaultValue = {
		appName: APP_NAME,
		appSignature: APP_SIGNATURE,
		appLogo: APP_LOGO_URL
	};

	const body = {
		email: user.email,
		tenantId: user.tenantId,
		...registerDefaultValue,
		appEmailConfirmationUrl: VERIFY_EMAIL_CALLBACK_URL || appEmailConfirmationUrl
	};

	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/resend-link' : `/auth/verify/resend-link`;

	return post<ISuccessResponse>(endpoint, body);
};

export const signInEmailAPI = (email: string) => {
	const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/signin.email' : `/auth/signin-email`;

	return post<{ status: number; message: string }>(endpoint, {
		email,
		appMagicSignUrl: callbackUrl,
		appName: APP_NAME
	});
};

export const verifyUserEmailByTokenAPI = (email: string, token: string) => {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify' : `/auth/verify/token`;

	return post<ISuccessResponse>(endpoint, { email, token });
};

export async function signInEmailConfirmAPI(email: string, code: string) {
	if (GAUZY_API_BASE_SERVER_URL.value) {
		return signInEmailConfirmGauzy(email, code);
	}

	return api.post<ISigninEmailConfirmResponse>('/auth/signin-email-confirm', {
		email,
		code
	});
}

export const signInWorkspaceAPI = (email: string, token: string, selectedTeam: string) => {
	if (GAUZY_API_BASE_SERVER_URL.value) {
		return signInWorkspaceGauzy({ email, token, teamId: selectedTeam, code: 'sign-in-workspace' });
	}

	return api.post<ILoginResponse>(`/auth/signin-workspace`, {
		email,
		token,
		teamId: selectedTeam
	});
};

export const registerUserTeamAPI = (data: IRegisterDataAPI) => {
	return api.post<ILoginResponse>('/auth/register', data);
};
