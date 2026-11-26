import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getRequestToJoinRequest, requestToJoinRequest } from '@/core/services/server/requests';
import { IJoinTeamRequest } from '@/core/types/interfaces/team/request-to-join';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	const requestToJoinData = await getRequestToJoinRequest({
		bearer_token: access_token,
		tenantId,
		organizationId
	});

	return NextResponse.json(requestToJoinData.data);
}

export async function POST(req: Request) {
	const body = (await req.json()) as IJoinTeamRequest;

	try {
		const response = await requestToJoinRequest(body);
		return NextResponse.json(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The request to join the team could not be sent.');
	}
}
