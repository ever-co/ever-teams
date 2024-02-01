import { INVITE_CALLBACK_PATH } from '@app/constants';
import { authFormValidate } from '@app/helpers/validations';
import { sendAuthCodeRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const url = new URL(req.url);
	const callbackUrl = `${url.origin}${INVITE_CALLBACK_PATH}`;

	const body = (await req.json()) as unknown as { email: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	const codeSendRes = await sendAuthCodeRequest(body.email, callbackUrl).catch(() => void 0);

	if (!codeSendRes) {
		return NextResponse.json({
			errors: {
				email: "We couldn't find any account associated to this email"
			}
		});
	}

	return NextResponse.json(codeSendRes.data);
}
