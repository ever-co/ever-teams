import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTeamProjectScope } from '@/core/services/server/team-project-scope';
import {
	createRelatedIssueTypeRequest,
	getTaskRelatedIssueTypeListRequest
} from '@/core/services/server/requests/task-related-issue-type';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const par = { tenantId, organizationId, ...getTeamProjectScope(req) };

	try {
		const { data } = await getTaskRelatedIssueTypeListRequest(par, access_token);
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The related issue type could not be read.');
	}
}

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as ITaskRelatedIssueTypeCreate;

	try {
		const response = await createRelatedIssueTypeRequest(body, access_token || '', body?.tenantId);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The related issue type could not be created.');
	}
}
