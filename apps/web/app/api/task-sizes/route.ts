import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamProjectScope } from '@/core/services/server/team-project-scope';
import { createSizesRequest, getTaskSizesListRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const par = { tenantId, organizationId, ...getTeamProjectScope(req) };

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
