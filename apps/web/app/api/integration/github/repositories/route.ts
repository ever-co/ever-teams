import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getGithubIntegrationRepositoriesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { searchParams } = new URL(req.url);

	const { integrationId } = searchParams as unknown as { integrationId: string };

	const response = await getGithubIntegrationRepositoriesRequest(
		{
			tenantId,
			organizationId,
			integrationId: integrationId as string
		},
		access_token
	);

	return $res(response.data);
}
