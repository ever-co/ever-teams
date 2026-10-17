import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createVersionRequest, getTaskVersionListRequest } from '@/core/services/server/requests/task-version';
import { TTaskVersionCreate } from '@/core/types/schemas/task/task-version.schema';
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
