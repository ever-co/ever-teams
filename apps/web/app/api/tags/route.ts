import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createLabelsRequest, getTaskLabelsListRequest } from '@/core/services/server/requests/task-labels';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const organizationTeamId = searchParams.get('organizationTeamId') || null;

	const par = {
		tenantId,
		organizationId,
		organizationTeamId
	};

	return $res(await getTaskLabelsListRequest(par, access_token));
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const body = (await req.json()) as ITagCreate;

	const { $res, user, access_token, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const response = await createLabelsRequest(body, access_token || '', body?.tenantId);

	return $res(response.data);
}
