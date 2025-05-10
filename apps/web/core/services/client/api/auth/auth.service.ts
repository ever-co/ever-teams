import { APIService, getFallbackAPI } from '../../api.service';
import {
	ILoginResponse,
	IOrganizationTeam,
	IRegisterDataAPI,
	ISigninEmailConfirmResponse,
	ISuccessResponse,
	IUser
} from '@/core/types/interfaces';
import { getRefreshTokenCookie, setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL
} from '@/core/constants/config/constants';
import { ProviderEnum } from '@/core/services/server/requests/o-auth';
import { signinService } from './signin.service';
import { userService } from '../users';

class AuthService extends APIService {
	refreshToken = async () => {
		const api = await getFallbackAPI();
		const refresh_token = getRefreshTokenCookie();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const { data } = await this.post<{ token: string }>('/auth/refresh-token', {
				refresh_token
			});

			setAccessTokenCookie(data.token);

			return userService.getAuthenticatedUserData();
		}

		return api.post<ILoginResponse>(`/auth/refresh`, {
			refresh_token
		});
	};

	// PRIMARY METHOD: Mobile uses this for both invite and auth codes
	signInWithEmailAndCode = async (email: string, code: string) => {
		console.log('SIGNING IN WITH EMAIL AND CODE', {
			email,
			code
		});
		// Direct call to /auth/login to handles both invite and auth codes
		return this.post<ILoginResponse>(`/auth/login`, {
			email,
			code
		});
	};

	sendAuthCode = async (email: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<{ status: number; message: string }>('/auth/signin.email', {
				email
			});
		}

		// Fallback for non-Gauzy
		const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;
		return this.post<{ status: number; message: string }>(`/auth/send-code`, {
			email,
			callbackUrl
		});
	};

	resendVerifyUserLink = async (user: IUser) => {
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
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<{ status: number; message: string }>('/auth/signin.email', {
				email
			});
		}

		// Keep web behavior for non-Gauzy
		const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;
		return this.post<{ status: number; message: string }>(`/auth/signin-email`, {
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

	signInEmailConfirm = async (email: string, code: string) => {
		// Mobile uses /auth/signin.email/confirm as fallback
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<ISigninEmailConfirmResponse>('/auth/signin.email/confirm', {
				email,
				code,
				includeTeams: true
			});
		}
		const api = await getFallbackAPI();
		// Non-Gauzy fallback
		return api.post<ISigninEmailConfirmResponse>('/auth/signin-email-confirm', {
			email,
			code,
			includeTeams: true
		});
	};

	// DEPRECATED: Not used in mobile
	signInEmailConfirmCall = async (email: string, code: string) => {
		// Use mobile style for consistency
		return this.signInEmailConfirm(email, code);
	};

	// FIXED: Workspace signin following mobile approach
	signInWorkspace = async (params: {
		email: string;
		token: string;
		selectedTeam: string;
		code?: string;
		defaultTeamId?: IOrganizationTeam['id'];
		lastTeamId?: IOrganizationTeam['id'];
	}) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const workspaceParams = {
				email: params.email,
				token: params.token,
				teamId: params.selectedTeam,
				defaultTeamId: params.defaultTeamId,
				lastTeamId: params.lastTeamId
				// Note: NO CODE is sent here
			};

			return signinService.signInWorkspaceGauzy(workspaceParams);
		}
		const api = await getFallbackAPI();
		// Non-Gauzy workspace signin - also no code
		return api.post<ILoginResponse>(`/auth/signin-workspace`, {
			email: params.email,
			token: params.token,
			teamId: params.selectedTeam
		});
	};

	registerUserTeam = async (data: IRegisterDataAPI) => {
		const api = await getFallbackAPI();
		return api.post<ILoginResponse>('/auth/register', data);
	};
}

export const authService = new AuthService(GAUZY_API_BASE_SERVER_URL.value);
