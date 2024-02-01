import { IRequestToJoinCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getRequestToJoinRequest, requestToJoinRequest } from '@app/services/server/requests';
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
	const body = (await req.json()) as IRequestToJoinCreate;

	const response = await requestToJoinRequest(body);

	return NextResponse.json(response.data);
}
