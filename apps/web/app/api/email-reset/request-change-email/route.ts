import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { emailResetRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { email } = (await req.json()) as {
		email: string;
	};

	const response = await emailResetRequest({
		email,
		tenantId,
		bearer_token: access_token
	});

	return $res(response.data);
}
