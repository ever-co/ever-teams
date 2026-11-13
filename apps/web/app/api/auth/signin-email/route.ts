import { SIGN_IN_CALLBACK_PATH } from '@/core/constants/config/constants';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { signInEmailRequest } from '@/core/services/server/requests';
import { appPublicOrigin } from '@/core/services/server/requests/account-deletion';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	// The link of the e-mail opens this app's sign-in page. Its origin is the configured one first: behind a reverse
	// proxy the request's own URL can be an internal address, which Gauzy would not put in an e-mail.
	const origin = appPublicOrigin() ?? new URL(req.url).origin;
	const callbackUrl = `${origin}${SIGN_IN_CALLBACK_PATH}`;

	const body = (await req.json()) as unknown as { email: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const codeSendRes = await signInEmailRequest(body.email, callbackUrl).catch(() => void 0);

	if (!codeSendRes) {
		return NextResponse.json(
			{
				errors: {
					email: "We couldn't find any account associated to this email"
				}
			},
			{ status: 400 }
		);
	}

	return NextResponse.json(codeSendRes.data);
}
