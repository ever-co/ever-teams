import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createSizesRequest, getTaskSizesListRequest } from '@/core/services/server/requests';
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

	const { data } = await getTaskSizesListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskSizesCreate;

	const response = await createSizesRequest(body, access_token || '', body?.tenantId);

	return $res(response.data);
}
