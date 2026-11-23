import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getIntegrationRequest } from '@/core/services/server/requests/integrations';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);

	try {
		const response = await getIntegrationRequest(
			{
				tenantId: tenantId,
				integrationTypeId: searchParams.get('integrationTypeId') as string,
				searchQuery: searchParams.get('searchQuery') as string
			},
			access_token
		);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The list of integrations could not be read.');
	}
}
