import { IIssueTypesCreate } from '@/core/types/interfaces/to-review';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createIssueTypeRequest, getIssueTypesListRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { searchParams } = new URL(req.url);
	const { organizationTeamId } = searchParams as unknown as { organizationTeamId: string };

	const par = {
		tenantId,
		organizationId,
		organizationTeamId: (organizationTeamId as string) || null
	};

	const { data } = await getIssueTypesListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await req.json()) as IIssueTypesCreate;

	const response = await createIssueTypeRequest(body, access_token, body?.tenantId || tenantId);

	return $res(response.data);
}
