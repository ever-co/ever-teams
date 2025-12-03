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
import { isTokenExpired, decodeJWT, getTokenRemainingTime, formatRemainingTime } from '@/core/lib/auth/jwt-utils';
import { NextRequest, NextResponse } from 'next/server';

import createMiddleware from 'next-intl/middleware';
import { delay } from './core/lib/auth/retry-logic';

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
		localePrefix: 'as-needed'
	});

	// Setting cookies on the response
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
			return null;
		}

		return chunks.join('');
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
			await delay(50);
			access_token = reconstructTokenFromChunks(totalChunks, 1);
		}
	}

	const refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value.trim();

	const url = new URL(request.url);

	const deny_redirect = (defaultRoute: boolean): NextResponse => {
		const redirectToPassCode = defaultRoute || url.pathname == DEFAULT_MAIN_PATH;
		const redirectResponse = NextResponse.redirect(
			url.origin + (redirectToPassCode ? DEFAULT_APP_PATH : '/unauthorized')
		);
		cookiesKeys().forEach((key) => {
			redirectResponse.cookies.set(key, '');
		});
		redirectResponse.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
		return redirectResponse;
	};

	const protected_path = PROTECTED_APP_URL_PATHS.some((v) => {
		return v.test(url.pathname);
	});

	// Helper function to check if error is a token expiration error
	// Handles multiple error formats:
	// - serverFetch: { statusCode: 401, message: 'Unauthorized' }
	// - Axios: { response: { status: 401 } }
	// - Generic: { status: 401 }
	const isTokenExpiredError = (error: any): boolean => {
		// serverFetch format (most common in this codebase)
		if (error?.statusCode === 401) {
			return true;
		}
		// Axios format
		if (error?.response?.status === 401) {
			return true;
		}
		// Generic format
		if (error?.status === 401) {
			return true;
		}
		// Message fallback
		if (error?.message === 'Unauthorized') {
			return true;
		}
		return false;
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

			const isExpired = isTokenExpiredError(verifyRes);
			return { success: false, error: `Token verification failed: ${verifyRes?.response?.status}`, isExpired };
		} catch (error: any) {
			const errorMsg = error?.message || 'Unknown error';
			const statusCode = error?.response?.status || error?.status;
			const isExpired = isTokenExpiredError(error);

			return {
				success: false,
				error: `Refresh failed: ${errorMsg} (${statusCode || 'no status'})`,
				isExpired
			};
		}
	};

	// Helper function to retry refresh with exponential backoff (up to 3 seconds)
	// 3s allows ~3-4 retry attempts while keeping acceptable UX (2s+ is noticeable but tolerable)
	const tryRefreshAndVerifyWithRetry = async (
		maxDurationMs = 3000
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
				await delay(delayMs);
				retryCount++;
			} else {
				break;
			}
		}

		console.log(`[Proxy] Token refresh failed after ${retryCount} retries and ${Date.now() - startTime}ms`);
		return lastResult || { success: false, error: 'Max retry duration exceeded', isExpired: true };
	};

	// SECTION 1: Handle authenticated users accessing auth pages
	// Check if user is trying to access auth pages while already authenticated
	const is_auth_path = /^\/auth\//.test(url.pathname);
	const has_any_token = access_token || refresh_token;

	if (is_auth_path && has_any_token) {
		// User is authenticated but trying to access auth pages - verify token and redirect
		console.log('[Proxy] Authenticated user accessing auth page, checking token validity...');

		if (access_token) {
			// OPTIMIZATION: Check token expiration locally FIRST (no API call needed)
			// This avoids unnecessary API calls when we can determine validity locally
			if (!isTokenExpired(access_token, 60)) {
				// Token is valid locally (not expired within 60s buffer)
				// Redirect immediately without API call
				const remaining = getTokenRemainingTime(access_token);
				console.log(
					`[Proxy] Token valid locally (${formatRemainingTime(remaining)} remaining), redirecting to main app`
				);
				return NextResponse.redirect(new URL(DEFAULT_MAIN_PATH, request.url));
			}

			// Token is expired or expiring soon - need to refresh
			console.log('[Proxy] Token expired locally, will attempt refresh...');
		}

		if (refresh_token) {
			// Try to refresh token with retry (up to 3 seconds)
			console.log('[Proxy] Attempting token refresh with retry...');
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
		// This handles the edge case where we have tokens but both verification and refresh failed
		console.log('[Proxy] Invalid tokens detected on auth page, clearing cookies');
		for (const key of cookiesKeys()) {
			response.cookies.set(key, '');
		}
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
		// Note: We intentionally don't return here - we fall through to return response at the end
	}

	// SECTION 2: Handle protected paths - user must be authenticated
	// Protected paths require valid authentication. We handle three cases:
	// 1. No tokens at all → redirect to login
	// 2. Access token exists → verify it locally first, then API if needed, refresh if expired
	// 3. Only refresh token exists → attempt refresh
	//
	// OPTIMIZATION: We now check token expiration LOCALLY first using decodeJWT
	// This avoids unnecessary API calls when the token is clearly valid or expired
	//
	// Note: These cases are mutually exclusive (if/else if/else if structure)
	// so a single request will only execute ONE of these branches.

	if (protected_path && !access_token && !refresh_token) {
		// CASE 1: No tokens at all - redirect to login
		console.log('[Proxy] No auth tokens found on protected path, redirecting to login');
		return deny_redirect(false);
	} else if (protected_path && access_token) {
		// CASE 2: Access token exists - check validity locally first
		const tokenPayload = decodeJWT(access_token);
		const isExpiredLocally = isTokenExpired(access_token, 60);

		if (tokenPayload && !isExpiredLocally) {
			// Token is valid locally - verify with API to get user data
			// We still need the API call here to get user data for x-user header
			const remaining = getTokenRemainingTime(access_token);
			console.log(
				`[Proxy] Token valid locally (${formatRemainingTime(remaining)} remaining), verifying with API...`
			);

			const authResult = await currentAuthenticatedUserRequest({
				bearer_token: access_token
			}).catch((error) => {
				console.error('[Proxy] API verification failed despite valid local token:', error?.message || error);
				return null;
			});

			if (authResult?.response.ok) {
				// Access token is valid - set user header and continue
				response.headers.set('x-user', JSON.stringify(authResult.data));
			}
			// INTENTIONAL: If API fails but token is valid locally, we proceed WITHOUT refresh.
			// Why? The token passed local validation (signature OK, not expired, decodable).
			// API failures can be temporary (network issues, server down, 500 errors).
			//
			// Previous logic refreshed/redirected on ANY API failure, which caused:
			// - Users logged out in loops on transient network issues
			// - Unnecessary token refreshes consuming refresh token attempts
			//
			// What happens if the token is actually revoked (401 from API)?
			// - Request proceeds without x-user header (no SSR user data)
			// - Client makes API calls with the same token → gets 401
			// - Client auth hooks (useAuthenticateUser) detect 401 → handleUnauthorized() → logout
			//
			// This is GRACEFUL DEGRADATION, not a broken session. The client recovers.
		} else {
			// Token is expired locally or invalid - skip API call, go straight to refresh
			console.log('[Proxy] Token expired locally, skipping API verification, attempting refresh...');

			const refreshResult = await tryRefreshAndVerifyWithRetry();

			if (refreshResult.success && refreshResult.userData) {
				console.log('[Proxy] Token refreshed successfully');
				response.headers.set('x-user', JSON.stringify(refreshResult.userData));
				return response;
			}

			// Refresh failed - check if token is expired
			if (refreshResult.isExpired) {
				console.log('[Proxy] Refresh token expired, redirecting to login');
				return deny_redirect(true);
			}
			// If refresh failed due to temporary error, we don't return here.
			// The request will proceed without x-user header, and the application
			// will handle the missing authentication context appropriately.
		}
		// After this block, we fall through to return response at the end
	} else if (protected_path && !access_token && refresh_token) {
		// CASE 3: Only refresh token exists - attempt direct refresh with retry (up to 3 seconds)
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
			return deny_redirect(true);
		}
		// If refresh failed due to temporary error, we don't return here.
		// The request will proceed without x-user header, and the application
		// will handle the missing authentication context appropriately.
	}

	// SECTION 3: Return response

	// At this point, we've handled all authentication scenarios:
	// - Authenticated users on auth pages: either redirected or cleared cookies
	// - Protected paths: either authenticated, redirected, or proceeding without auth
	// - Public paths: allowed through as-is
	//
	// Note: We intentionally allow authenticated users to access public paths
	// (e.g., /auth/passcode, /auth/workspace, /auth/accept-invite)
	// This enables users to switch accounts, workspaces, or accept invitations

	return response;
}
