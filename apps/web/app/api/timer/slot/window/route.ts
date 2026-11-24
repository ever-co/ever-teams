import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getEmployeeWindowTimeSlotsRequest } from '@/core/services/server/requests/timer/timer-slot';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

/**
 * The signed-in employee's own time slots between two dates, of runs started between them (#5123): what a catch-up
 * write reads before it writes, so that a write whose answer was lost is not sent again.
 */
export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const startDate = new Date(searchParams.get('startDate') ?? '');
	const endDate = new Date(searchParams.get('endDate') ?? '');
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
		return NextResponse.json({ error: 'startDate and endDate must be valid dates, in order' }, { status: 400 });
	}

	const employeeId = user.employee?.id;
	if (!employeeId) return $res([]);

	try {
		const { data } = await getEmployeeWindowTimeSlotsRequest({
			tenantId,
			organizationId,
			employeeId,
			startDate,
			endDate,
			bearer_token: access_token
		});
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The time slots could not be read.');
	}
}
