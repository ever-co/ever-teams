import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getIntegrationTenantRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const { searchParams } = new URL(req.url);
	const name = searchParams.get('name') || undefined;

	try {
		const response = await getIntegrationTenantRequest(
			{
				tenantId,
				organizationId,
				name: name as string
			},
			access_token
		);

		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The integration could not be read.');
	}
}
