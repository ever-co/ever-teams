import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { hasErrors } from '@/core/lib/helpers/validations';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { NextResponse } from 'next/server';

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

		const { data: user } = await currentAuthenticatedUserRequest({
			bearer_token: refreshResult.data.token
		});

		// NOTE: We don't set cookies server-side here because:
		// 1. NextResponse.json() creates a new response object, losing any headers set on `res`
		// 2. The client (authService.refreshToken) stores the token from the JSON body
		// This keeps the responsibility clear: API returns data, client manages cookies.
		return NextResponse.json({ user, token: refreshResult.data.token });
	} catch (error: any) {
		// IMPORTANT: Default to 500, NOT 401, for unknown errors.
		// Why? Errors without a status code are typically network/timeout issues.
		// Returning 401 would cause the client to treat transient failures as "token invalid → logout",
		// when the token might actually be fine. 500 signals "try again later" instead.
		const statusCode = error?.statusCode || error?.status || 500;
		const message = error?.message || 'Token refresh failed';

		// Log full error details in dev mode for debugging (stack trace, etc.)
		logErrorInDev('API /auth/refresh Refresh failed:', error);
		console.error('[API /auth/refresh] Refresh failed:', { statusCode, message });

		return NextResponse.json({ message, statusCode }, { status: statusCode });
	}
}
