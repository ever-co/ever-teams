import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getGithubIntegrationMetadataRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { searchParams } = new URL(req.url);

	const { integrationId } = searchParams as unknown as { integrationId: string };

	const response = await getGithubIntegrationMetadataRequest(
		{
			tenantId,
			organizationId,
			integrationId: integrationId as string
		},
		access_token
	);

	return $res(response);
}
