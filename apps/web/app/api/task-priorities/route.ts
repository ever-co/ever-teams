import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createPrioritiesRequest, getTaskPrioritiesListRequest } from '@/core/services/server/requests/task-priorities';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const organizationTeamId = searchParams.get('organizationTeamId') || null;
	const projectId = searchParams.get('projectId') || null;

	const par = {
		tenantId,
		organizationId,
		organizationTeamId,
		...(projectId !== null ? { projectId } : {})
	};

	const { data } = await getTaskPrioritiesListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskPrioritiesCreate;

	const response = await createPrioritiesRequest(body, access_token || '', body?.tenantId);

	return $res(response.data);
}
