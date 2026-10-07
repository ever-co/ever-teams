import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getOrganizationEmployees } from '@/core/services/server/requests';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const organizationTeamId = req.nextUrl.searchParams.get('organizationTeamId') ?? undefined;

	const response = await getOrganizationEmployees(
		access_token || '',
		tenantId || '',
		organizationId || '',
		organizationTeamId
	);

	return $res(response.data);
}
