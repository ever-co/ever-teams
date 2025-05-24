import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/ITaskStatus';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createStatusRequest, getTaskStatusListRequest } from '@/core/services/server/requests/taskStatus';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { organizationTeamId } = searchParams as unknown as { organizationTeamId: string };

	const par = {
		tenantId,
		organizationId,
		organizationTeamId: (organizationTeamId as string) || null
	};

	const { data } = await getTaskStatusListRequest(par, access_token);

	return $res(data);
}
export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) {
		console.log('[WEB][API] Unauthorized request');
		return $res('Unauthorized');
	}

	try {
		const body = (await req.json()) as unknown as ITaskStatusCreate;

		const response = await createStatusRequest(body, access_token || '', body?.tenantId);

		return $res(response.data);
	} catch (error) {
		console.error('[WEB][API] Error:', error);
		return $res('Error creating task status');
	}
}
