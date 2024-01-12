import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteEmployeeTimeSlotsRequest,
	getEmployeeTimeSlotsRequest
} from '@app/services/server/requests/timer/timer-slot';
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

// https://api.gauzy.co/api/timesheet/time-slot?employeeIds[0]=ae7548dd-79ea-4db2-ada9-6a8ceb5118e3&organizationId=6c247b8d-5853-404a-b774-57d01620d9cf&tenantId=b545069e-48c8-44a2-bcb4-5699fd2013be&startDate=2024-01-10 22:00&endDate=2024-01-11 21:59&relations[0]=screenshots&relations[1]=timeLogs
