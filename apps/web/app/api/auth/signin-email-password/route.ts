import { validateForm } from '@/core/lib/helpers/validations';
import { signInEmailPasswordRequest } from '@/core/services/server/requests';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as { email: string; password: string };

	const { errors, isValid } = validateForm(['email', 'password'], body);

	if (!isValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { data } = await signInEmailPasswordRequest(body.email, body.password);

	return NextResponse.json(data);
}
