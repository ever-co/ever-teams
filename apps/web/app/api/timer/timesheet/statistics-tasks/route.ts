import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { tasksTimesheetStatisticsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const { $res, user, tenantId, organizationId, access_token, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	const activeTask = searchParams.get('activeTask') === 'true';
	const employeeId = searchParams.get('employeeId') || user.employee?.id || '';
	// The team another member is viewed through (see statisticsService.tasksTimesheetStatistics)
	const teamIds = searchParams.get('teamId') ? [searchParams.get('teamId') as string] : undefined;

	if (activeTask && !taskId) {
		return $res({
			global: [],
			today: []
		});
	}

	try {
		const { data } = await tasksTimesheetStatisticsRequest(
			{
				tenantId,
				organizationId,
				employeeIds: employeeId ? [employeeId] : [],
				...(teamIds ? { teamIds } : {}),
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
				...(teamIds ? { teamIds } : {}),
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
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The time worked on the tasks could not be read.');
	}
}
