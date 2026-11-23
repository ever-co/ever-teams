import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getOrganizationEmployees } from '@/core/services/server/requests';
import { NextRequest, NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: NextRequest) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	// The guard's refusal carries a real HTTP status (401 for a refused session, 503 when Gauzy could not
	// answer), so the client interceptor re-authenticates on a 401 and never logs out on an outage.
	if (!user) return $res('Unauthorized');

	const organizationTeamId = req.nextUrl.searchParams.get('organizationTeamId') ?? undefined;

	try {
		const response = await getOrganizationEmployees(
			access_token || '',
			tenantId || '',
			organizationId || '',
			organizationTeamId
		);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The list of members could not be read.');
	}
}
