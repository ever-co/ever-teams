import { z } from 'zod';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateEmployeePresenceRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

// Not strict: the client API service adds tenantId and organizationId to every PUT body.
const presenceBody = z.object({ isIdle: z.boolean() });

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = presenceBody.safeParse(await req.json().catch(() => null));
	if (!body.success) {
		return NextResponse.json({ error: 'isIdle must be a boolean' }, { status: 400 });
	}

	const response = await updateEmployeePresenceRequest({
		bearer_token: access_token,
		tenantId,
		isIdle: body.data.isIdle
	});

	return $res(response.data);
}
