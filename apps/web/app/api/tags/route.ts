import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createLabelsRequest, getTaskLabelsListRequest } from '@/core/services/server/requests/task-labels';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { organizationTeamId } = searchParams as unknown as { organizationTeamId: string };

	const par = {
		tenantId,
		organizationId,
		organizationTeamId: (organizationTeamId as string) || null
	};

	return $res(await getTaskLabelsListRequest(par, access_token));
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const body = (await req.json()) as ITagCreate;

	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const response = await createLabelsRequest(body, access_token || '', body?.tenantId);

	return $res(response.data);
}
