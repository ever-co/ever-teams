import { ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	createRelatedIssueTypeRequest,
	getTaskRelatedIssueTypeListRequest
} from '@app/services/server/requests/task-related-issue-type';
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

	return $res(await getTaskRelatedIssueTypeListRequest(par, access_token));
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = req.body as unknown as ITaskRelatedIssueTypeCreate;

	return $res(await createRelatedIssueTypeRequest(body, access_token, body?.tenantId));
}
