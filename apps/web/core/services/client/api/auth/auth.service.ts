import { APIService, getFallbackAPI } from '../../api.service';
import { getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { isSessionOver, renewSession } from '@/core/lib/auth/session-renewal';
import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	RESET_PASSWORD_CALLBACK_PATH,
	SIGN_IN_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL
} from '@/core/constants/config/constants';
import { appEmailBranding } from '@/core/lib/helpers/app-email-branding';
import { EProvider } from '@/core/types/generics/enums/social-accounts';
import { signinService } from './signin.service';
import { userService } from '../users';
import {
	IAuthResponse,
	IRegisterDataAPI,
	ISigninEmailConfirmResponse,
	IUserSigninWorkspaceResponse
} from '@/core/types/interfaces/auth/auth';
import { ISuccessResponse } from '@/core/types/interfaces/common/data-response';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { TUser } from '@/core/types/schemas';
import { logInDev } from '@/core/lib/helpers/error-message';

/**
 * What the browser sends Gauzy for a sign-in code (`POST /auth/signin.email`, direct mode): the address, this app's
 * e-mail branding and the link to its sign-in page, so the e-mail is this app's and its link opens this app. Gauzy
 * adds `?email=&code=` to the link, and uses it only on an origin its deployment lists (its own page otherwise).
 */
function signInCodeRequestBody(email: string) {
	return { email, ...appEmailBranding(), appMagicSignUrl: `${location.origin}${SIGN_IN_CALLBACK_PATH}` };
}

/**
 * The request that renews the session answers for itself: its 401 says the refresh token is refused, and must not
 * start the renewal a refused request starts (api.service.ts handleUnauthorized).
 */
const RENEWAL_REQUEST = { noSessionRenewal: true };

class AuthService extends APIService {
	/**
	 * Exchange a refresh token for a new access (+ rotated refresh) token — raw, no cookie side-effects.
	 * Talks to the RUNTIME API base URL (direct Gauzy API, or the Next /api/auth/refresh route as fallback).
	 *
	 * 🛑 Do NOT use core/services/server/requests.refreshTokenRequest from client code for this: that helper
	 * is built on serverFetch → GAUZY_API_SERVER_URL, a SERVER env var that is undefined in the browser
	 * bundle and falls back to the hard-coded production host. On stage/dev the proactive refresh was
	 * posting refresh tokens to https://api.ever.team, getting 401 and force-logging users out (2026-08-17).
	 */
	refreshTokenRaw = async (refresh_token: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<{ token: string; refresh_token: string }>(
				'/auth/refresh-token',
				{ refresh_token },
				RENEWAL_REQUEST
			);
		}
		const api = await getFallbackAPI();
		return api.post<{ token: string; refresh_token: string }>('/auth/refresh', { refresh_token }, RENEWAL_REQUEST);
	};

	/**
	 * Mint tokens for another organization of the caller's tenant (`POST /auth/switch-organization`). Gauzy confines a
	 * non-admin to the organization in the token, so the token must follow the organization the app acts in. Answers
	 * `{ user, token, refresh_token }`, or null when Gauzy refuses. No cookie side effects.
	 */
	switchOrganizationRaw = async (organizationId: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<IAuthResponse | null>('/auth/switch-organization', { organizationId });
		}
		const api = await getFallbackAPI();
		return api.post<IAuthResponse | null>('/auth/switch-organization', { organizationId });
	};

	/**
	 * Renews the session for a page that needs a fresh token (new permissions after a team is created or left, an
	 * invitation accepted), then reads the user again in direct mode.
	 *
	 * The renewal itself is the browser's one renewal (session-renewal.ts): it is shared with a request the API
	 * refused and with the renewal ahead of time, so the refresh token, which Gauzy accepts once, is never sent twice.
	 */
	refreshToken = async () => {
		const refresh_token = getRefreshTokenCookie();

		if (!refresh_token) {
			throw new Error('No refresh token available');
		}

		logInDev('[AuthService] Attempting token refresh...');

		try {
			const renewal = await renewSession();
			if (isSessionOver(renewal)) {
				throw Object.assign(new Error('The API refuses the refresh token'), { status: 401 });
			}
			if (renewal.outcome === 'unavailable') {
				throw renewal.error ?? new Error('The session could not be renewed now');
			}
			if (renewal.outcome === 'ended') {
				// Its refresh token was lost to a rotation: the session works until its access token expires
				throw new Error('The session can no longer be renewed');
			}

			logInDev('[AuthService] Token refreshed successfully');
			if (GAUZY_API_BASE_SERVER_URL.value) {
				// Get fresh user data with the new token
				return userService.getAuthenticatedUserData();
			}
			return undefined;
		} catch (error: any) {
			// The API service rejects with an ApiErrorService, which keeps the HTTP status in `statusCode`: without it a
			// refused refresh token (401) was not told apart from a renewal that could not be made
			const status = error?.response?.status || error?.status || error?.statusCode;
			console.error('[AuthService] Token refresh failed:', {
				status,
				message: error?.message,
				hasRefreshToken: !!refresh_token
			});

			// Re-throw with more context
			const enhancedError = new Error(`Token refresh failed: ${error?.message || 'Unknown error'}`);
			(enhancedError as any).status = status;
			(enhancedError as any).response = error?.response;
			throw enhancedError;
		}
	};

	// PRIMARY METHOD: Mobile uses this for both invite and auth codes
	signInWithEmailAndCode = async (email: string, code: string) => {
		// Direct call to /auth/login to handles both invite and auth codes
		return this.post<IAuthResponse>(`/auth/login`, {
			email,
			code
		});
	};

	sendAuthCode = async (email: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<{ status: number; message: string }>('/auth/signin.email', signInCodeRequestBody(email));
		}

		// Fallback for non-Gauzy
		const callbackUrl = `${location.origin}${INVITE_CALLBACK_PATH}`;
		return this.post<{ status: number; message: string }>(`/auth/send-code`, {
			email,
			callbackUrl
		});
	};

	resendVerifyUserLink = async (user: TUser) => {
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
			return this.post<{ status: number; message: string }>('/auth/signin.email', signInCodeRequestBody(email));
		}

		// Proxy mode: this app's route adds the branding and the link itself, from its own configuration
		return this.post<{ status: number; message: string }>(`/auth/signin-email`, { email });
	};

	signInEmailPassword = async (email: string, password: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? '/auth/signin.email.password'
			: `/auth/signin-email-password`;
		return this.post<IUserSigninWorkspaceResponse>(endpoint, { email, password, includeTeams: true });
	};

	signInEmailSocialLogin = async (provider: EProvider, access_token: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/signin.provider.social' : `/auth/signin-email-social`;

		return this.post<ISigninEmailConfirmResponse>(endpoint, { provider, access_token, includeTeams: true });
	};

	signInEmailConfirm = async (email: string, code: string) => {
		// Mobile uses /auth/signin.email/confirm as fallback
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<IUserSigninWorkspaceResponse>('/auth/signin.email/confirm', {
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

	// Workspace signin following mobile approach
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
		return api.post<IAuthResponse>(`/auth/signin-workspace`, {
			email: params.email,
			token: params.token,
			teamId: params.selectedTeam,
			lastTeamId: params.lastTeamId
		});
	};

	registerUserTeam = async (data: IRegisterDataAPI) => {
		const api = await getFallbackAPI();
		return api.post<IAuthResponse>('/auth/register', data);
	};

	/**
	 * Request a password reset email.
	 * Calls POST /auth/request-password with the user's email.
	 * The API sends an email with a reset link containing a token.
	 *
	 * The link opens this app's own page: in direct mode the browser names it (`appResetPasswordUrl`, which Gauzy uses
	 * only on an origin its deployment lists); in proxy mode this app's route does, from its own configuration.
	 */
	requestPassword = async (email: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<boolean>('/auth/request-password', {
				email,
				appResetPasswordUrl: `${location.origin}${RESET_PASSWORD_CALLBACK_PATH}`
			});
		}
		const api = await getFallbackAPI();
		return api.post<boolean>('/auth/request-password', { email });
	};

	/**
	 * Reset (change) the user's password using a valid reset token.
	 * Calls POST /auth/reset-password with the token and new password.
	 */
	resetPassword = async (token: string, password: string, confirmPassword: string) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<boolean>('/auth/reset-password', { token, password, confirmPassword });
		}
		const api = await getFallbackAPI();
		return api.post<boolean>('/auth/reset-password', { token, password, confirmPassword });
	};
}

export const authService = new AuthService(GAUZY_API_BASE_SERVER_URL.value);
