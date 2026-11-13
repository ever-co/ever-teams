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

	// The link of the e-mail opens this app's own page, on the configured origin first: behind a reverse proxy the
	// request's own URL can be an internal address, which Gauzy does not put in an e-mail.
	const origin = appPublicOrigin() ?? new URL(req.url).origin;
	const resetPasswordUrl = `${origin}${RESET_PASSWORD_CALLBACK_PATH}`;

	const result = await requestPasswordRequest(body.email, resetPasswordUrl).catch(() => null);

	if (!result) {
		return NextResponse.json({ message: 'Password reset request failed' }, { status: 400 });
	}

	return NextResponse.json(result.data);
}
