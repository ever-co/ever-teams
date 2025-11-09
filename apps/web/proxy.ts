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

	// Debug: Log all cookies for debugging
	const allCookieNames: string[] = [];
	for (const [name] of request.cookies) {
		allCookieNames.push(name);
	}

	const totalChunksCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}_totalChunks`)?.value.trim();

	// Helper function to reconstruct token from chunks with retry logic
	const reconstructTokenFromChunks = (totalChunks: number, retryCount: number = 0): string | null => {
		const chunks = range(totalChunks).map((index) => {
			const chunkCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}${index}`)?.value.trim();

			if (!chunkCookie) {
				console.warn(`[Proxy] Missing chunk ${index} of ${totalChunks}`);
				return null;
			}

			return chunkCookie;
		});

		const missingChunks = chunks.filter((chunk) => chunk === null).length;
		if (missingChunks > 0) {
			console.error(`[Proxy] ${missingChunks} chunks missing out of ${totalChunks} (retry: ${retryCount})`);
			return null;
		}

		const reconstructed = chunks.join('');
		console.log('[Proxy] Reconstructed token from chunks:', {
			totalChunks,
			tokenLength: reconstructed?.length || 0,
			retryCount
		});
		return reconstructed;
	};

	if (!totalChunksCookie) {
		access_token = request.cookies.get(TOKEN_COOKIE_NAME)?.value.trim() || '';
	} else if (totalChunksCookie) {
		const totalChunks = Number.parseInt(totalChunksCookie);
		access_token = reconstructTokenFromChunks(totalChunks, 0);

		// If token reconstruction failed and we have chunks, it might be a race condition
		// during login where cookies are still being set. Add a small delay to allow
		// all cookies to be properly set before verification.
		if (!access_token && totalChunks > 0) {
			console.log('[Proxy] Token reconstruction failed, likely race condition during login. Adding delay...');
			// Small delay to allow cookies to settle
			await new Promise((resolve) => setTimeout(resolve, 50));
			access_token = reconstructTokenFromChunks(totalChunks, 1);
		}
	}

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

	// Helper function to check if error is a token expiration error
	const isTokenExpiredError = (error: any): boolean => {
		const status = error?.response?.status;
		// 401 = Token invalide ou expiré
		return status === 401;
	};

	// Helper function to attempt token refresh and verify
	const tryRefreshAndVerify = async (): Promise<{
		success: boolean;
		userData?: any;
		error?: string;
		isExpired?: boolean;
	}> => {
		if (!refresh_token) {
			console.log('[Proxy] No refresh token available for refresh attempt');
			return { success: false, error: 'No refresh token', isExpired: true };
		}

		try {
			console.log('[Proxy] Attempting token refresh...');
			const refreshRes = await refreshTokenRequest(refresh_token);
			if (!refreshRes?.data?.token) {
				console.error('[Proxy] Token refresh failed: No token in response', refreshRes);
				return { success: false, error: 'No token in refresh response', isExpired: true };
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
			const isExpired = isTokenExpiredError(verifyRes);
			return { success: false, error: `Token verification failed: ${verifyRes?.response?.status}`, isExpired };
		} catch (error: any) {
			const errorMsg = error?.message || 'Unknown error';
			const statusCode = error?.response?.status || error?.status;
			const isExpired = isTokenExpiredError(error);

			console.error('[Proxy] Token refresh failed:', {
				error: errorMsg,
				status: statusCode,
				isUnauthorized: statusCode === 401,
				isExpired
			});

			return {
				success: false,
				error: `Refresh failed: ${errorMsg} (${statusCode || 'no status'})`,
				isExpired
			};
		}
	};

	// Helper function to retry refresh with exponential backoff (up to 6 seconds)
	const tryRefreshAndVerifyWithRetry = async (
		maxDurationMs = 6000
	): Promise<{ success: boolean; userData?: any; error?: string; isExpired?: boolean }> => {
		const startTime = Date.now();
		let lastResult: any = null;
		let retryCount = 0;

		while (Date.now() - startTime < maxDurationMs) {
			try {
				const result = await tryRefreshAndVerify();
				if (result.success) {
					console.log(`[Proxy] Token refresh succeeded after ${retryCount} retries`);
					return result;
				}

				lastResult = result;

				// If token is expired, don't retry
				if (result.isExpired) {
					console.log('[Proxy] Token expired, not retrying');
					return result;
				}

				// If it's a temporary error, retry
				console.log(`[Proxy] Temporary error, retrying (attempt ${retryCount + 1})...`);
			} catch (error) {
				lastResult = { success: false, error: String(error) };
				console.log(`[Proxy] Refresh attempt ${retryCount + 1} failed, retrying...`);
			}

			// Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms
			const delayMs = Math.min(100 * Math.pow(2, retryCount), 3200);
			const remainingTime = maxDurationMs - (Date.now() - startTime);

			if (remainingTime > delayMs) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				retryCount++;
			} else {
				break;
			}
		}

		console.log(`[Proxy] Token refresh failed after ${retryCount} retries and ${Date.now() - startTime}ms`);
		return lastResult || { success: false, error: 'Max retry duration exceeded', isExpired: true };
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
			// Try to refresh token with aggressive retry (up to 6 seconds)
			console.log('[Proxy] Access token invalid, attempting refresh with retry...');
			const refreshResult = await tryRefreshAndVerifyWithRetry();
			if (refreshResult.success) {
				// User is authenticated after refresh, redirect to main app
				console.log('[Proxy] User authenticated after refresh, redirecting from auth page to main app');
				return NextResponse.redirect(new URL(DEFAULT_MAIN_PATH, request.url));
			}

			// If refresh failed due to token expiration, allow access to auth page
			if (refreshResult.isExpired) {
				console.log('[Proxy] Refresh token expired, allowing access to auth page');
				return response;
			}

			// If refresh failed due to temporary error, allow access to auth page
			console.log('[Proxy] Refresh failed due to temporary error, allowing access to auth page');
			return response;
		}

		// If we reach here, tokens are invalid - clear them and allow access to auth page
		console.log('[Proxy] Invalid tokens detected on auth page, clearing cookies');
		for (const key of cookiesKeys()) {
			response.cookies.set(key, '');
		}
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
	}

	// Handle protected paths - user must be authenticated
	if (protected_path && !access_token && !refresh_token) {
		// No tokens at all - redirect to login
		console.log('[Proxy] No auth tokens found on protected path, redirecting to login');
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
			// Access token invalid/expired - try to refresh with aggressive retry
			console.log('[Proxy] Access token invalid, attempting refresh with retry...');
			const refreshResult = await tryRefreshAndVerifyWithRetry();

			if (refreshResult.success && refreshResult.userData) {
				console.log('[Proxy] Token refreshed successfully');
				response.headers.set('x-user', JSON.stringify(refreshResult.userData));
				return response;
			}

			// Refresh failed - check if token is expired
			if (refreshResult.isExpired) {
				console.log('[Proxy] Refresh token expired, redirecting to login');
				deny_redirect(true);
			} else {
				// Temporary error - allow request to proceed (client will retry)
				console.log('[Proxy] Refresh failed due to temporary error, allowing request to proceed');
			}
		}
	} else if (protected_path && !access_token && refresh_token) {
		// Case 3: Only refresh token exists - attempt direct refresh with aggressive retry
		console.log('[Proxy] No access token but refresh token exists, attempting refresh with retry...');
		const refreshResult = await tryRefreshAndVerifyWithRetry();

		if (refreshResult.success && refreshResult.userData) {
			console.log('[Proxy] Token refreshed successfully');
			response.headers.set('x-user', JSON.stringify(refreshResult.userData));
			return response;
		}

		// Refresh failed - check if token is expired
		if (refreshResult.isExpired) {
			console.log('[Proxy] Refresh token expired, redirecting to login');
			deny_redirect(true);
		} else {
			// Temporary error - allow request to proceed (client will retry)
			console.log('[Proxy] Refresh failed due to temporary error, allowing request to proceed');
		}
	}
	// Note: We intentionally allow authenticated users to access public paths
	// (e.g., /auth/passcode, /auth/workspace, /auth/accept-invite)
	// This enables users to switch accounts, workspaces, or accept invitations

	return response;
}
