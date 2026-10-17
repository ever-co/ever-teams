import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getEmployeeDailyRequest } from '@/core/services/server/requests/timer/daily';
import { NextResponse } from 'next/server';

function toDate(value: string | null): Date | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const startDate = toDate(searchParams.get('startDate'));
	const endDate = toDate(searchParams.get('endDate'));
	const type = searchParams.get('types[0]') || searchParams.get('type') || undefined;
	const title = searchParams.get('title[0]') || undefined;

	const { data } = await getEmployeeDailyRequest({
		tenantId,
		organizationId,
		employeeId: searchParams.get('employeeIds[0]') || user.employee?.id || '',
		todayEnd: endDate,
		todayStart: startDate,
		type,
		title,
		bearer_token: access_token,
		activityLevel: { start: 0, end: 100 }
	});

	return $res(data);
}
