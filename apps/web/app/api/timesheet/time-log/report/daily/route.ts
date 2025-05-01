import { NextRequest } from 'next/server';
import { getTimeLogReportDailyRequest } from '@/core/services/server/requests/timesheet';
import { ITimeLogRequestParams } from '@/core/services/server/requests/timesheet';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams;

		const params: Partial<ITimeLogRequestParams> = {
			tenantId: searchParams.get('tenantId') || undefined,
			organizationId: searchParams.get('organizationId') || undefined,
			startDate: searchParams.get('startDate') || undefined,
			endDate: searchParams.get('endDate') || undefined,
			timeZone: searchParams.get('timeZone') || undefined,
			groupBy: searchParams.get('groupBy') || undefined
		};

		if (!params.tenantId || !params.organizationId || !params.startDate || !params.endDate) {
			return new Response(
				JSON.stringify({
					message:
						'Required parameters missing: tenantId, organizationId, startDate, and endDate are required'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const projectIds = searchParams.getAll('projectIds[]');
		const employeeIds = searchParams.getAll('employeeIds[]');
		const taskIds = searchParams.getAll('taskIds[]');
		const teamIds = searchParams.getAll('teamIds[]');

		if (projectIds.length) params.projectIds = projectIds;
		if (employeeIds.length) params.employeeIds = employeeIds;
		if (taskIds.length) params.taskIds = taskIds;
		if (teamIds.length) params.teamIds = teamIds;

		const activityLevelStart = searchParams.get('activityLevel[start]');
		const activityLevelEnd = searchParams.get('activityLevel[end]');

		if (activityLevelStart && activityLevelEnd) {
			params.activityLevel = {
				start: parseInt(activityLevelStart),
				end: parseInt(activityLevelEnd)
			};
		}

		const response = await getTimeLogReportDailyRequest(params as ITimeLogRequestParams);

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Error in daily report API:', error);
		return new Response(
			JSON.stringify({
				message: 'Internal server error',
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}
