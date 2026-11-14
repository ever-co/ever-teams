import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { hasErrors } from '@/core/lib/helpers/validations';
import { unwrapRejection } from '@/core/services/server/fetch';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { NextResponse } from 'next/server';

/** Gauzy's error body (`statusCode`, `message`), or the error of a request that got no answer. */
type RefreshFailure = { statusCode?: number; status?: number; message?: string };

export async function POST(req: Request) {
	const body = (await req.json()) as { refresh_token: string } | null;
	const refresh_token = body?.refresh_token;

	if (!refresh_token || refresh_token.trim().length < 2) {
		return NextResponse.json(
			hasErrors({
				refresh_token: 'The refresh token must be provided on the request body'
			}),
			{ status: 400 }
		);
	}

	try {
		const refreshResult = await refreshTokenRequest(refresh_token);
		if (!refreshResult?.data?.token) {
			console.error('[API /auth/refresh] No token in refresh response');
			return NextResponse.json(
				{ message: 'Token refresh failed: No token received', statusCode: 401 },
				{ status: 401 }
			);
		}

		// Gauzy has rotated the refresh token by now: the new pair is the only one it accepts from here on, so it is
		// answered whatever the profile read gives. Dropped, it left the browser with a refresh token Gauzy refuses.
		const user = await currentAuthenticatedUserRequest({
			bearer_token: refreshResult.data.token
		}).then(
			({ data }) => data,
			async (error: unknown) => {
				logErrorInDev('API /auth/refresh Profile read failed after the renewal:', await unwrapRejection(error));
				return undefined;
			}
		);

		// NOTE: We don't set cookies server-side here because:
		// 1. NextResponse.json() creates a new response object, losing any headers set on `res`
		// 2. The client (authService.refreshToken) stores the token from the JSON body
		// This keeps the responsibility clear: API returns data, client manages cookies.

		// Return both token and refresh_token (if provided by backend for token rotation)
		return NextResponse.json({
			user,
			token: refreshResult.data.token,
			refresh_token: refreshResult.data.refresh_token // Include new refresh token if provided
		});
	} catch (error: any) {
		// IMPORTANT: Default to 500, NOT 401, for unknown errors.
		// Why? Errors without a status code are typically network/timeout issues.
		// Returning 401 would cause the client to treat transient failures as "token invalid → logout",
		// when the token might actually be fine. 500 signals "try again later" instead.
		//
		// A refusal of Gauzy (the refresh token expired, was revoked, or was rotated by another renewal) is not one of
		// them: serverFetch rejects it with a promise that holds Gauzy's body, read here. Looked for on the promise
		// itself, its status and message were never found, and the browser was answered 500 for every refusal.
		const reason = (await unwrapRejection(error)) as RefreshFailure | null | undefined;
		const statusCode = reason?.statusCode || reason?.status || 500;
		const message = reason?.message || 'Token refresh failed';

		// Log full error details in dev mode for debugging (stack trace, etc.)
		logErrorInDev('API /auth/refresh Refresh failed:', reason);
		console.error('[API /auth/refresh] Refresh failed:', { statusCode, message });

		return NextResponse.json({ message, statusCode }, { status: statusCode });
	}
}
