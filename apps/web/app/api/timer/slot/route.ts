import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getEmployeeTimeSlotsRequest } from '@app/services/server/requests/timer/timer-slot';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { todayEnd, todayStart } = searchParams as unknown as {
		todayEnd: Date;
		endDate: Date;
		todayStart: Date;
		startDate: Date;
	};

	const { data } = await getEmployeeTimeSlotsRequest({
		tenantId,
		organizationId,
		employeeId: user.employee.id,
		todayEnd,
		todayStart,
		bearer_token: access_token
	});

	return $res(data);
}
