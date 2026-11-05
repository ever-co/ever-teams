import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getGithubIntegrationRepositoriesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);

	const integrationId = searchParams.get('integrationId')?.trim();
	// Without it Gauzy would be asked for /integration/github/undefined/...
	if (!integrationId) return NextResponse.json({ message: 'integrationId is required' }, { status: 400 });

	const response = await getGithubIntegrationRepositoriesRequest(
		{
			tenantId,
			organizationId,
			integrationId
		},
		access_token
	);

	return $res(response.data);
}
