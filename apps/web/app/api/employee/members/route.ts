import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getOrganizationEmployees } from '@/core/services/server/requests';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	// The guard's refusal carries a real HTTP status (401 for a refused session, 503 when Gauzy could not
	// answer), so the client interceptor re-authenticates on a 401 and never logs out on an outage.
	if (!user) return $res('Unauthorized');

	const organizationTeamId = req.nextUrl.searchParams.get('organizationTeamId') ?? undefined;

	const response = await getOrganizationEmployees(
		access_token || '',
		tenantId || '',
		organizationId || '',
		organizationTeamId
	);

	return $res(response.data);
}
