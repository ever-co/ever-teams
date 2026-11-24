import { validateForm } from '@/core/lib/helpers/validations';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { signInEmailPasswordRequest } from '@/core/services/server/requests';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as { email: string; password: string };

	const { errors, isValid } = validateForm(['email', 'password'], body);

	if (!isValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	try {
		const { data } = await signInEmailPasswordRequest(body.email, body.password);
		return NextResponse.json(data);
	} catch (error) {
		// A wrong password is the API's 401: it goes back as it is, so the form can say so (#5741)
		return await gauzyErrorResponse(error, 'Sign-in failed');
	}
}
