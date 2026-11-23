import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getGithubIntegrationMetadataRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);

	const integrationId = searchParams.get('integrationId')?.trim();
	// Without it Gauzy would be asked for /integration/github/undefined/...
	if (!integrationId) return NextResponse.json({ message: 'integrationId is required' }, { status: 400 });

	try {
		const response = await getGithubIntegrationMetadataRequest(
			{
				tenantId,
				organizationId,
				integrationId
			},
			access_token
		);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The GitHub installation could not be read.');
	}
}
