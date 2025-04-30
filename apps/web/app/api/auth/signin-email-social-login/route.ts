import { signWithSocialLoginsRequest } from '@/core/services/server/requests';
import { ProviderEnum } from '@/core/services/server/requests/OAuth';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as { provider: ProviderEnum; access_token: string };

	const { data } = await signWithSocialLoginsRequest(body.provider, body.access_token);

	return NextResponse.json(data);
}
