import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getOrganizationEmployees } from '@/core/services/server/requests';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	// A real 401, not $res, whose body carries statusCode 401 under an HTTP 200: the client
	// interceptor keys on the HTTP status, so a 200 skips re-authentication and the error body
	// reaches the member list validator instead.
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const organizationTeamId = req.nextUrl.searchParams.get('organizationTeamId') ?? undefined;

	const response = await getOrganizationEmployees(
		access_token || '',
		tenantId || '',
		organizationId || '',
		organizationTeamId
	);

	return $res(response.data);
}
