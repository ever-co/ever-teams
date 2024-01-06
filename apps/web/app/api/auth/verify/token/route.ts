import { authFormValidate } from '@app/helpers/validations';
import { verifyUserEmailByTokenRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = req.body as unknown as { email: string; token: string };

	const { errors, valid: formValid } = authFormValidate(['email', 'token'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	const { data } = await verifyUserEmailByTokenRequest({
		token: body.token,
		email: body.email
	});

	NextResponse.json(data);
}
