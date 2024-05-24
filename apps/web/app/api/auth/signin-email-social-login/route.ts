import { validateForm } from '@app/helpers/validations';
import { signWithSocialLoginsRequest } from '@app/services/server/requests';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as { email: string; password: string };

	const { errors, isValid } = validateForm(['email'], body);

	if (!isValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { data } = await signWithSocialLoginsRequest(body.email);

	return NextResponse.json(data);
}
