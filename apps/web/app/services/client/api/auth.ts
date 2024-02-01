import { getRefreshTokenCookie, setAccessTokenCookie } from '@app/helpers/cookies';
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

export const getAuthenticatedUserDataAPI = () => {
	const params = {} as { [x: string]: string };
	const relations = ['employee', 'role', 'tenant'];

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const query = new URLSearchParams(params);

	return get<IUser>(`/user/me?${query.toString()}`);
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

export const registerUserTeamAPI = (data: IRegisterDataAPI) => {
	return api.post<ILoginResponse>('/auth/register', data);
};

export const signInEmailAPI = (email: string) => {
	return api.post<{ status: number; message: string }>(`/auth/signin-email`, {
		email
	});
};

export const verifyUserEmailByCodeAPI = (code: string) => {
	return api.post<ISuccessResponse>(`/auth/verify/code`, { code });
};

export const signInEmailConfirmAPI = (email: string, code: string) => {
	return api.post<ISigninEmailConfirmResponse>(`/auth/signin-email-confirm`, {
		email,
		code
	});
};

export const signInWorkspaceAPI = (email: string, token: string, selectedTeam: string) => {
	return api.post<ILoginResponse>(`/auth/signin-workspace`, {
		email,
		token,
		teamId: selectedTeam
	});
};

export const verifyUserEmailByTokenAPI = (email: string, token: string) => {
	return api.post<ISuccessResponse>(`/auth/verify/token`, { email, token });
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

	return post<ISuccessResponse>(`/auth/verify/resend-link`, body);
};
