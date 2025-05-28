import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { verifyChangemailRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { code } = (await req.json()) as {
		code: string;
	};

	const response = await verifyChangemailRequest({
		code,
		tenantId,
		bearer_token: access_token
	});

	return $res(response.data);
}
