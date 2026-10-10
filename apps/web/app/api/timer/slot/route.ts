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

	const todayStart = new Date(searchParams.get('todayStart') ?? '');
	const todayEnd = new Date(searchParams.get('todayEnd') ?? '');

	if (Number.isNaN(todayStart.getTime()) || Number.isNaN(todayEnd.getTime())) {
		return NextResponse.json({ error: 'todayStart and todayEnd must be valid dates' }, { status: 400 });
	}

	const { data } = await getEmployeeTimeSlotsRequest({
		tenantId,
		organizationId,
		employeeId: searchParams.get('employeeId') || user.employee?.id || '',
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
	// The client serializes ids with qs indices (ids[0]=...), which searchParams.getAll('ids') would miss
	const ids = [...searchParams].filter(([key]) => /^ids(\[\d*\])?$/.test(key)).map(([, id]) => id);

	if (ids.length === 0) {
		return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
	}

	const { data } = await deleteEmployeeTimeSlotsRequest({
		tenantId,
		organizationId,
		ids,
		forceDelete: searchParams.get('forceDelete') === 'true',
		bearer_token: access_token
	});

	return $res(data);
}
