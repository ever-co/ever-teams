import { setAccessTokenCookie } from '@/core/lib/helpers/cookies';
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
			})
		);
	}

	const { data } = await refreshTokenRequest(refresh_token);
	if (!data) {
		return NextResponse.error();
	}

	const { data: user } = await currentAuthenticatedUserRequest({
		bearer_token: data.token
	});

	setAccessTokenCookie(data.token, { res, req });

	return NextResponse.json({ user, token: data.token });
}
