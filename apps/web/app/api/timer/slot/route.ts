import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	deleteEmployeeTimeSlotsRequest,
	getEmployeeTimeSlotsRequest
} from '@/core/services/server/requests/timer/timer-slot';
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
		employeeId: user.employee?.id || '',
		todayEnd,
		todayStart,
		bearer_token: access_token
	});

	return $res(data);
}

export async function DELETE(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const ids: string[] = searchParams.getAll('ids');

	const { data } = await deleteEmployeeTimeSlotsRequest({
		tenantId,
		organizationId,
		ids,
		bearer_token: access_token
	});

	return $res(data);
}
