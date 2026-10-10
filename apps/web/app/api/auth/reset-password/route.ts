import { resetPasswordRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = ((await req.json().catch(() => null)) ?? {}) as {
		token?: string;
		password?: string;
		confirmPassword?: string;
	};
	const { token, password, confirmPassword } = body;

	if (!token || !password || !confirmPassword) {
		return NextResponse.json({ message: 'Token and password are required' }, { status: 400 });
	}

	const result = await resetPasswordRequest({ token, password, confirmPassword }).catch(() => null);

	if (!result) {
		return NextResponse.json({ message: 'Password reset failed' }, { status: 400 });
	}

	return NextResponse.json(result.data);
}
