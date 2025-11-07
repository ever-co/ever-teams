import {
	APPLICATION_DEFAULT_LANGUAGE,
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	DEFAULT_MAIN_PATH,
	PROTECTED_APP_URL_PATHS,
	REFRESH_TOKEN_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@/core/constants/config/constants';
import { cookiesKeys, setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { range } from '@/core/lib/helpers';
import { NextRequest, NextResponse } from 'next/server';

import createMiddleware from 'next-intl/middleware';

export const config = {
	matcher: [
		'/',
		'/(en|ar|bg|zh|nl|de|he|it|pl|pt|ru|es|fr)/:path*',
		'/((?!api|_next|_vercel|.*\\..*).*)',
		'/auth/(.*)',
		'/profile/:path*',
		'/settings/(.*)',
		'/task(.*)',
		'/meet(.*)',
		'/board(.*)',
		'/kanban(.*)',
		'/unauthorized(.*)'
	]
};

export { auth as authMiddleware } from './auth';

export async function proxy(request: NextRequest) {
	const nextIntlMiddleware = createMiddleware({
		defaultLocale: APPLICATION_DEFAULT_LANGUAGE,
		locales: APPLICATION_LANGUAGES_CODE,
		// pathnames,
		localePrefix: 'as-needed'
	});

	// Setting cookies on the response
	// let response = NextResponse.next();
	let response = nextIntlMiddleware(request);

	const paths = new URL(request.url).pathname.split('/').filter(Boolean);

	if (
		!paths.includes('join') &&
		(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
	) {
		return response;
	}

	let access_token = null;

	const totalChunksCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}_totalChunks`)?.value.trim();
	if (!totalChunksCookie) {
		access_token = request.cookies.get(TOKEN_COOKIE_NAME)?.value.trim() || '';
	} else if (totalChunksCookie) {
		const totalChunks = parseInt(totalChunksCookie);
		const chunks = range(totalChunks).map((index) => {
			const chunkCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}${index}`)?.value.trim();

			if (!chunkCookie) {
				return null; // Chunk cookie not found.
			}

			return chunkCookie;
		});

		// Concatenate and return the large string.
		access_token = chunks.join('');
	}

	// request.cookies.get(TOKEN_COOKIE_NAME)?.value.trim();
	const refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value.trim();

	const url = new URL(request.url);

	const deny_redirect = (defaultRoute: boolean) => {
		const redirectToPassCode = defaultRoute || url.pathname == DEFAULT_MAIN_PATH;
		response = NextResponse.redirect(url.origin + (redirectToPassCode ? DEFAULT_APP_PATH : '/unauthorized'));
		cookiesKeys().forEach((key) => {
			response.cookies.set(key, '');
		});
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
	};

	const protected_path = PROTECTED_APP_URL_PATHS.some((v) => {
		return v.test(url.pathname);
	});

	// Helper function to attempt token refresh and verify
	const tryRefreshAndVerify = async (): Promise<{ success: boolean; userData?: any }> => {
		if (!refresh_token) {
			return { success: false };
		}

		try {
			const refreshRes = await refreshTokenRequest(refresh_token);
			if (!refreshRes?.data?.token) {
				return { success: false };
			}

			// Update cookie with new token
			setAccessTokenCookie(refreshRes.data.token, { res: response, req: request });

			// Verify the new token works
			const verifyRes = await currentAuthenticatedUserRequest({
				bearer_token: refreshRes.data.token
			});

			if (verifyRes?.response.ok) {
				return { success: true, userData: verifyRes.data };
			}

			return { success: false };
		} catch (error) {
			console.error('[Proxy] Token refresh failed:', error);
			return { success: false };
		}
	};

	// Handle protected paths
	if ((protected_path && !refresh_token) || (protected_path && !access_token)) {
		deny_redirect(false);
	} else if (protected_path && access_token) {
		// Try to authenticate with current access token
		const authResult = await currentAuthenticatedUserRequest({
			bearer_token: access_token
		}).catch(() => null);

		// If authentication failed, try to refresh token
		if (authResult?.response.ok) {
			// Access token is valid
			response.headers.set('x-user', JSON.stringify(authResult.data));
		} else {
			const refreshResult = await tryRefreshAndVerify();

			if (refreshResult.success && refreshResult.userData) {
				response.headers.set('x-user', JSON.stringify(refreshResult.userData));
				return response;
			}

			// Both access token and refresh failed - redirect to login
			deny_redirect(true);
		}
	}
	// Note: We intentionally allow authenticated users to access public paths
	// (e.g., /auth/passcode, /auth/workspace, /auth/accept-invite)
	// This enables users to switch accounts, workspaces, or accept invitations

	return response;
}
