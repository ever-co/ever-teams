import { getRefreshTokenCookie } from '@app/helpers/cookies';
import {
	ILoginReponse,
	IRegisterDataAPI,
} from '@app/interfaces/IAuthentication';
import api from '../axios';

export const signInWithEmailAndCodeAPI = (email: string, code: string) => {
	return api.post<ILoginReponse>(`/auth/login`, {
		email,
		code,
	});
};

export const refreshTokenAPI = () => {
	return api.post<ILoginReponse>(`/auth/refresh`, {
		refresh_token: getRefreshTokenCookie(),
	});
};

export const registerUserTeamAPI = (data: IRegisterDataAPI) => {
	return api.post<ILoginReponse>('/auth/register', data);
};

export const getAuthenticatedUserDataAPI = () => {
	return api.get<Pick<ILoginReponse, 'user'>>(`/user/me`);
};
