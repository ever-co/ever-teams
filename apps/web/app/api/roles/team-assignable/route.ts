import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamAssignableRolesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	try {
		const response = await getTeamAssignableRolesRequest({
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});

		return $res(response.data);
	} catch (error) {
		// serverFetch rejects a non-2xx answer with Promise.reject(data): pass Gauzy's status on (403 for a caller
		// without the permission, 404 on an API without this route) instead of a 500 with a stack trace.
		const body: unknown = error instanceof Promise ? await error.catch((data: unknown) => data) : undefined;
		const statusCode = (body as { statusCode?: unknown } | undefined)?.statusCode;
		const status = typeof statusCode === 'number' && statusCode >= 400 ? statusCode : 502;
		return NextResponse.json(body ?? { message: 'Roles request failed' }, { status });
	}
}
