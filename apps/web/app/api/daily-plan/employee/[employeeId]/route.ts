import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getDayPlansByEmployee, readResponseShape } from '@/core/services/server/requests';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

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

	try {
		const response = await getDayPlansByEmployee({
			bearer_token: access_token || '',
			employeeId,
			organizationId,
			tenantId,
			organizationTeamId,
			// The browser's `shape=lean` reaches the API through the proxy too (ever-co/ever-gauzy#11730)
			shape: readResponseShape(new URL(req.url).searchParams)
		});

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, "The member's plans could not be read.");
	}
}
