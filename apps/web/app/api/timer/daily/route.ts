import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getEmployeeDailyRequest } from '@/core/services/server/requests/timer/daily';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { endDate, startDate, type } = searchParams as unknown as {
		startDate: Date;
		endDate: Date;
		type: string;
	};

	const { data } = await getEmployeeDailyRequest({
		tenantId,
		organizationId,
		employeeId: user.employee?.id || '',
		todayEnd: endDate,
		todayStart: startDate,
		type,
		bearer_token: access_token,
		activityLevel: { start: 0, end: 100 }
	});

	return $res(data);
}
