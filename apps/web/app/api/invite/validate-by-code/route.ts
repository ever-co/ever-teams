import { validateForm } from '@app/helpers/validations';
import { IInviteVerifyCode } from '@app/interfaces/IInvite';
import { verifyInviteCodeRequest } from '@app/services/server/requests';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IInviteVerifyCode;

	const { errors, isValid: formValid } = validateForm(['code', 'email'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { data } = await verifyInviteCodeRequest(body);

	NextResponse.json(data, { status: 200 });
}
