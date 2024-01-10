import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getEmployeeDailyRequest } from '@app/services/server/requests/timer/daily';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { endDate, startDate, type } = searchParams as unknown as {
		todayEnd: Date;
		endDate: Date;
		todayStart: Date;
		startDate: Date;
		type: string;
	};

	const { data } = await getEmployeeDailyRequest({
		tenantId,
		organizationId,
		employeeId: user.employee.id,
		todayEnd: endDate,
		todayStart: startDate,
		type,
		bearer_token: access_token
	});

	return $res(data);
}
