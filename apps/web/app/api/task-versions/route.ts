import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamProjectScope } from '@/core/services/server/team-project-scope';
import { createVersionRequest, getTaskVersionListRequest } from '@/core/services/server/requests/task-version';
import { TTaskVersionCreate } from '@/core/types/schemas/task/task-version.schema';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const par = { tenantId, organizationId, ...getTeamProjectScope(req) };

	const { data } = await getTaskVersionListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as TTaskVersionCreate;

	const response = await createVersionRequest(body, access_token || '', body?.tenantId);

	return $res(response.data);
}
