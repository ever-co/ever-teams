import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { tasksTimesheetStatisticsRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, tenantId, organizationId, access_token, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const query = searchParams as unknown as { activeTask: string; employeeId: string };
	const activeTask = query.activeTask;
	let employeeId = query.employeeId;
	employeeId = employeeId || user.employee?.id;

	if (activeTask && !taskId) {
		return $res({
			global: [],
			today: []
		});
	}

	const { data } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			employeeIds: employeeId ? [employeeId] : [],
			defaultRange: 'false',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {})
		},
		access_token
	);

	const { data: todayData } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			employeeIds: employeeId ? [employeeId] : [],
			defaultRange: 'true',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {}),
			unitOfTime: 'day'
		},
		access_token
	);

	return $res({
		global: data,
		today: todayData
	});
}
