import { signWithSocialLoginsRequest } from '@/core/services/server/requests';
import { EProvider } from '@/core/types/generics/enums/social-accounts';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as { provider: EProvider; access_token: string };

	const { data } = await signWithSocialLoginsRequest(body.provider, body.access_token);

	return NextResponse.json(data);
}
