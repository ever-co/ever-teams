import { ITaskVersionCreate } from '@/core/types/interfaces';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createVersionRequest, getTaskVersionListRequest } from '@/core/services/server/requests/task-version';
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

	const { data } = await getTaskVersionListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskVersionCreate;

	const response = await createVersionRequest(body, access_token, body?.tenantId);

	return $res(response.data);
}
