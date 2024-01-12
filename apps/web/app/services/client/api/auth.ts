import { getRefreshTokenCookie } from '@app/helpers/cookies';
import { ISuccessResponse, IUser } from '@app/interfaces';
import { ILoginResponse, IRegisterDataAPI, ISigninEmailConfirmResponse } from '@app/interfaces/IAuthentication';
import api, { get } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';

export const signInWithEmailAndCodeAPI = (email: string, code: string) => {
	return api.post<ILoginResponse>(`/auth/login`, {
		email,
		code
	});
};

export const refreshTokenAPI = () => {
	return api.post<ILoginResponse>(`/auth/refresh`, {
		refresh_token: getRefreshTokenCookie()
	});
};

export const registerUserTeamAPI = (data: IRegisterDataAPI) => {
	return api.post<ILoginResponse>('/auth/register', data);
};

export const sendAuthCodeAPI = (email: string) => {
	return api.post<{ status: number; message: string }>(`/auth/send-code`, {
		email
	});
};
export const signInEmailAPI = (email: string) => {
	return api.post<{ status: number; message: string }>(`/auth/signin-email`, {
		email
	});
};

export const getAuthenticatedUserDataAPI = async () => {
	const params = {} as { [x: string]: string };
	const relations = ['employee', 'role', 'tenant'];

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const query = new URLSearchParams(params);

	const endpoint = `/user/me?${query.toString()}`;
	const data = await get<IUser>(endpoint);

	return GAUZY_API_BASE_SERVER_URL.value ? data : data;
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

export const resentVerifyUserLinkAPI = () => {
	return api.post<ISuccessResponse>(`/auth/verify/resend-link`);
};
