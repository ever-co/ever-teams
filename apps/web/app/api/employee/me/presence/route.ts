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

	try {
		const response = await updateEmployeePresenceRequest({
			bearer_token: access_token,
			tenantId,
			isIdle: body.data.isIdle
		});

		return $res(response.data);
	} catch (error) {
		// serverFetch rejects a non-2xx answer with Promise.reject(data): pass Gauzy's status on (404 on an API
		// without the presence endpoint), so the heartbeat can stop asking, instead of a 500.
		const rejection: { statusCode?: number } | undefined = await Promise.resolve(error).then(
			() => undefined,
			(gauzyError) => gauzyError
		);
		const status = typeof rejection?.statusCode === 'number' && rejection.statusCode >= 400 ? rejection.statusCode : 502;
		return NextResponse.json(rejection ?? { message: 'Presence heartbeat failed' }, { status });
	}
}
