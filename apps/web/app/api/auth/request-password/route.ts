import { RESET_PASSWORD_CALLBACK_PATH } from '@/core/constants/config/constants';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { requestPasswordRequest } from '@/core/services/server/requests';
import { appPublicOrigin } from '@/core/services/server/requests/account-deletion';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = ((await req.json().catch(() => null)) ?? {}) as { email?: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid || !body.email) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	// The link of the e-mail opens this app's own page, on the origin this deployment is configured with and never on
	// the request's own: that one can be an internal address behind a reverse proxy, or a host the caller named, and
	// the link carries the token that sets the password. Without a configured origin no page is named, and Gauzy
	// keeps its own link.
	const origin = appPublicOrigin();
	const resetPasswordUrl = origin ? `${origin}${RESET_PASSWORD_CALLBACK_PATH}` : undefined;

	const result = await requestPasswordRequest(body.email, resetPasswordUrl).catch(() => null);

	if (!result) {
		return NextResponse.json({ message: 'Password reset request failed' }, { status: 400 });
	}

	return NextResponse.json(result.data);
}
