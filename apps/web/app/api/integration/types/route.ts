import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getIntegrationTypesRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const response = await getIntegrationTypesRequest(
		{
			tenantId
		},
		access_token
	);

	return $res(response.data);
}
