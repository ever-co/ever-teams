import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getIntegrationRequest } from '@app/services/server/requests/integrations';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { searchParams } = new URL(req.url);

	const response = await getIntegrationRequest(
		{
			tenantId: tenantId,
			integrationTypeId: searchParams.get('integrationTypeId') as string,
			searchQuery: searchParams.get('searchQuery') as string
		},
		access_token
	);

	return $res(response.data);
}
