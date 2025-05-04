import qs from 'qs';
import { APIService } from '../../api.service';
import {
	ILoginResponse,
	IOrganizationTeam,
	IRegisterDataAPI,
	ISigninEmailConfirmResponse,
	ISuccessResponse,
	IUser
} from '@/core/types/interfaces';
import { getRefreshTokenCookie, getTenantIdCookie, setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL
} from '@/core/constants/config/constants';
import api from '../../axios';
import { ProviderEnum } from '@/core/services/server/requests/OAuth';
import { singinService } from './singin.service';

class AuthService extends APIService {
	/**
	 * Fetches data of the authenticated user with specified relations and the option to include employee details.
	 *
	 * @returns A Promise resolving to the IUser object.
	 */
	getAuthenticatedUserData = async () => {
		// Define the relations to be included in the request
		const relations = ['role', 'tenant'];

		// Construct the query string with 'qs', including the includeEmployee parameter
		const query = qs.stringify({
			relations: relations,
			includeEmployee: true // Append includeEmployee parameter set to true
		});

		// Execute the GET request to fetch the user data
		return this.get<IUser>(`/user/me?${query}`);
	};

	refreshToken = async () => {
		const refresh_token = getRefreshTokenCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const { data } = await this.post<{ token: string }>('/auth/refresh-token', {
				refresh_token
			});

			setAccessTokenCookie(data.token);

			return this.getAuthenticatedUserData();
		}

		return api.post<ILoginResponse>(`/auth/refresh`, {
			refresh_token
		});
	};

	signInWithEmailAndCode = async (email: string, code: string) => {
		return api.post<ILoginResponse>(`/auth/login`, {
			email,
			code
		});
	};

	sendAuthCode = async (email: string) => {
		const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;

		return this.post<{ status: number; message: string }>(`/auth/send-code`, {
			email,
			callbackUrl
		});
	};

	verifyUserEmailByCode = async (code: string, email: string) => {
		const tenantId = getTenantIdCookie();
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/code' : `/auth/verify/code`;

		return this.post<ISuccessResponse>(endpoint, { code, tenantId, email });
	};

	resentVerifyUserLink = async (user: IUser) => {
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

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? '/auth/email/verify/resend-link'
			: `/auth/verify/resend-link`;

		return this.post<ISuccessResponse>(endpoint, body);
	};

	signInEmail = async (email: string) => {
		const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/signin.email' : `/auth/signin-email`;

		return this.post<{ status: number; message: string }>(endpoint, {
			email,
			appMagicSignUrl: callbackUrl,
			appName: APP_NAME
		});
	};

	signInEmailPassword = async (email: string, password: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? '/auth/signin.email.password'
			: `/auth/signin-email-password`;
		return this.post<ISigninEmailConfirmResponse>(endpoint, { email, password, includeTeams: true });
	};

	signInEmailSocialLogin = async (provider: ProviderEnum, access_token: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/signin.provider.social' : `/auth/signin-email-social`;

		return this.post<ISigninEmailConfirmResponse>(endpoint, { provider, access_token, includeTeams: true });
	};

	verifyUserEmailByToken = async (email: string, token: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify' : `/auth/verify/token`;

		return this.post<ISuccessResponse>(endpoint, { email, token });
	};

	signInEmailConfirm = async (email: string, code: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return singinService.signInEmailConfirmGauzy(email, code);
		}

		return api.post<ISigninEmailConfirmResponse>('/auth/signin-email-confirm', {
			email,
			code
		});
	};

	signInWorkspace = async (params: {
		email: string;
		token: string;
		selectedTeam: string;
		code?: string;
		defaultTeamId?: IOrganizationTeam['id'];
		lastTeamId?: IOrganizationTeam['id'];
	}) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return singinService.signInWorkspaceGauzy({
				email: params.email,
				token: params.token,
				teamId: params.selectedTeam,
				code: params.code,
				defaultTeamId: params.defaultTeamId,
				lastTeamId: params.lastTeamId
			});
		}

		return api.post<ILoginResponse>(`/auth/signin-workspace`, {
			email: params.email,
			token: params.token,
			teamId: params.selectedTeam
		});
	};

	registerUserTeam = async (data: IRegisterDataAPI) => {
		return api.post<ILoginResponse>('/auth/register', data);
	};
}

export const authService = new AuthService(GAUZY_API_BASE_SERVER_URL.value);
