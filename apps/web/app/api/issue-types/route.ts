import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamProjectScope } from '@/core/services/server/team-project-scope';
import { IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { createIssueTypeRequest, getIssueTypesListRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const par = { tenantId, organizationId, ...getTeamProjectScope(req) };

	const { data } = await getIssueTypesListRequest(par, access_token);

	return $res(data);
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const body = (await req.json()) as IIssueTypesCreate;

	const response = await createIssueTypeRequest(body, access_token || '', body?.tenantId || tenantId || '');

	return $res(response.data);
}
