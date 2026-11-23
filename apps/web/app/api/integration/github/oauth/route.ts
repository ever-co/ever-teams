import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { oAuthEndpointAuthorization } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	const { installation_id, setup_action, code } = await req.json();

	try {
		const response = await oAuthEndpointAuthorization(
			{
				tenantId,
				organizationId,
				installation_id,
				setup_action,
				code
			},
			access_token
		);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The GitHub connection could not be created.');
	}
}
