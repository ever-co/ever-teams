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
	const tryRefreshAndVerify = async (): Promise<{ success: boolean; userData?: any; error?: string }> => {
		if (!refresh_token) {
			console.log('[Proxy] No refresh token available for refresh attempt');
			return { success: false, error: 'No refresh token' };
		}

		try {
			console.log('[Proxy] Attempting token refresh...');
			const refreshRes = await refreshTokenRequest(refresh_token);
			if (!refreshRes?.data?.token) {
				console.error('[Proxy] Token refresh failed: No token in response', refreshRes);
				return { success: false, error: 'No token in refresh response' };
			}

			// Update cookie with new token
			setAccessTokenCookie(refreshRes.data.token, { res: response, req: request });
			console.log('[Proxy] Access token cookie updated with new token');

			// Verify the new token works
			const verifyRes = await currentAuthenticatedUserRequest({
				bearer_token: refreshRes.data.token
			});

			if (verifyRes?.response.ok) {
				console.log('[Proxy] Token refresh and verification successful');
				return { success: true, userData: verifyRes.data };
			}

			console.error('[Proxy] Token verification failed after refresh', verifyRes?.response?.status);
			return { success: false, error: `Token verification failed: ${verifyRes?.response?.status}` };
		} catch (error: any) {
			const errorMsg = error?.message || 'Unknown error';
			const statusCode = error?.response?.status || error?.status;

			console.error('[Proxy] Token refresh failed:', {
				error: errorMsg,
				status: statusCode,
				isUnauthorized: statusCode === 401
			});

			return {
				success: false,
				error: `Refresh failed: ${errorMsg} (${statusCode || 'no status'})`
			};
		}
	};

	// Check if user is trying to access auth pages while already authenticated
	const is_auth_path = /^\/auth\//.test(url.pathname);
	const has_any_token = access_token || refresh_token;

	if (is_auth_path && has_any_token) {
		// User is authenticated but trying to access auth pages - verify token and redirect
		console.log('[Proxy] Authenticated user accessing auth page, verifying token...');

		if (access_token) {
			// Try to verify access token
			const authResult = await currentAuthenticatedUserRequest({
				bearer_token: access_token
			}).catch(() => null);

			if (authResult?.response.ok) {
				// User is authenticated, redirect to main app
				console.log('[Proxy] User is authenticated, redirecting from auth page to main app');
				return NextResponse.redirect(new URL(DEFAULT_MAIN_PATH, request.url));
			}
		}

		if (refresh_token) {
			// Try to refresh token
			const refreshResult = await tryRefreshAndVerify();
			if (refreshResult.success) {
				// User is authenticated after refresh, redirect to main app
				console.log('[Proxy] User authenticated after refresh, redirecting from auth page to main app');
				return NextResponse.redirect(new URL(DEFAULT_MAIN_PATH, request.url));
			}
		}

		// If we reach here, tokens are invalid - clear them and allow access to auth page
		console.log('[Proxy] Invalid tokens detected on auth page, clearing cookies');
		cookiesKeys().forEach((key) => {
			response.cookies.set(key, '');
		});
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
	}

	// Handle protected paths
	if (protected_path && !access_token && !refresh_token) {
		// Case 1: No tokens available - redirect to login
		console.log('[Proxy] No authentication tokens available, redirecting to login');
		deny_redirect(false);
	} else if (protected_path && access_token) {
		// Case 2: Access token exists - try to authenticate with it
		const authResult = await currentAuthenticatedUserRequest({
			bearer_token: access_token
		}).catch(() => null);

		if (authResult?.response.ok) {
			// Access token is valid
			response.headers.set('x-user', JSON.stringify(authResult.data));
		} else {
			// Access token invalid/expired - try to refresh
			const refreshResult = await tryRefreshAndVerify();

			if (refreshResult.success && refreshResult.userData) {
				console.log('[Proxy] Token refreshed successfully (access_token fallback path)');
				response.headers.set('x-user', JSON.stringify(refreshResult.userData));
				return response;
			}

			// Both access token and refresh failed - redirect to login
			console.log(`[Proxy] Both access token and refresh failed: ${refreshResult.error}`);
			deny_redirect(true);
		}
	} else if (protected_path && !access_token && refresh_token) {
		// Case 3: Only refresh token exists - attempt direct refresh
		// This handles the scenario where access_token expired but refresh_token is still valid
		console.log('[Proxy] No access token but refresh token exists, attempting direct refresh');
		const refreshResult = await tryRefreshAndVerify();

		if (refreshResult.success && refreshResult.userData) {
			console.log('[Proxy] Token refreshed successfully (refresh_token only path)');
			response.headers.set('x-user', JSON.stringify(refreshResult.userData));
			return response;
		}

		// Refresh failed - redirect to login
		console.log(`[Proxy] Refresh token refresh failed: ${refreshResult.error}, redirecting to login`);
		deny_redirect(true);
	}
	// Note: We intentionally allow authenticated users to access public paths
	// (e.g., /auth/passcode, /auth/workspace, /auth/accept-invite)
	// This enables users to switch accounts, workspaces, or accept invitations

	return response;
}
