import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { tasksTimesheetStatisticsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, tenantId, organizationId, access_token, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const activeTask = searchParams.get('activeTask');
	const employeeId = searchParams.get('employeeId') || user.employee?.id || '';

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
			...(activeTask && taskId ? { taskIds: [taskId] } : {})
		},
		access_token
	);

	const { data: todayData } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			employeeIds: employeeId ? [employeeId] : [],
			defaultRange: 'true',
			...(activeTask && taskId ? { taskIds: [taskId] } : {}),
			unitOfTime: 'day'
		},
		access_token
	);

	return $res({
		global: data,
		today: todayData
	});
}
