import { setAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { hasErrors } from '@/core/lib/helpers/validations';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();

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

		setAccessTokenCookie(refreshResult.data.token, { res, req });

		return NextResponse.json({ user, token: refreshResult.data.token });
	} catch (error: any) {
		const statusCode = error?.statusCode || error?.status || 401;
		const message = error?.message || 'Token refresh failed';

		// Log full error details in dev mode for debugging (stack trace, etc.)
		logErrorInDev('API /auth/refresh Refresh failed:', error);
		console.error('[API /auth/refresh] Refresh failed:', { statusCode, message });

		return NextResponse.json({ message, statusCode }, { status: statusCode });
	}
}
