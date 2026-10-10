import { authFormValidate } from '@/core/lib/helpers/validations';
import { requestPasswordRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = ((await req.json().catch(() => null)) ?? {}) as { email?: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid || !body.email) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const result = await requestPasswordRequest(body.email).catch(() => null);

	if (!result) {
		return NextResponse.json({ message: 'Password reset request failed' }, { status: 400 });
	}

	return NextResponse.json(result.data);
}
