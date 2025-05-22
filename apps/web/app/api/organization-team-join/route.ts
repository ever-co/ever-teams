import { IJoinTeamRequest } from '@/core/types/interfaces/to-review';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getRequestToJoinRequest, requestToJoinRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

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

	const response = await requestToJoinRequest(body);

	return NextResponse.json(response.data);
}
