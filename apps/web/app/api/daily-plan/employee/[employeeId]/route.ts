import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getDayPlansByEmployee } from '@/core/services/server/requests';

export async function GET(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
	const { employeeId } = await params;

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const response = await getDayPlansByEmployee({
		bearer_token: access_token || '',
		employeeId,
		organizationId,
		tenantId,
		organizationTeamId
	});

	return $res(response.data);
}
