import { NextRequest } from 'next/server';
import { getActivityReportRequest } from '@/app/services/server/requests/timesheet';
import { IActivityRequestParams } from '@/app/services/server/requests/timesheet';
import { TimeLogType } from '@/core/types/interfaces';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET handler for activity report endpoint
 * Fetches activity report data based on provided query parameters
 */
export async function GET(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams;

		const params: Partial<IActivityRequestParams> = {
			tenantId: searchParams.get('tenantId') || undefined,
			organizationId: searchParams.get('organizationId') || undefined,
			startDate: searchParams.get('startDate') || undefined,
			endDate: searchParams.get('endDate') || undefined,
			timeZone: searchParams.get('timeZone') || undefined,
			groupBy: searchParams.get('groupBy') || undefined
		};

		// Validate required parameters
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

		// Get array parameters
		const projectIds = searchParams.getAll('projectIds[]');
		const employeeIds = searchParams.getAll('employeeIds[]');
		const sources = searchParams.getAll('source[]');
		const logTypes = searchParams.getAll('logType[]');

		// Add array parameters if they exist
		if (projectIds.length) params.projectIds = projectIds;
		if (employeeIds.length) params.employeeIds = employeeIds;
		if (sources.length) params.source = sources as any[];
		if (logTypes.length) params.logType = logTypes as TimeLogType[];

		// Get activity level parameters
		const activityLevelStart = searchParams.get('activityLevel[start]');
		const activityLevelEnd = searchParams.get('activityLevel[end]');

		if (activityLevelStart && activityLevelEnd) {
			params.activityLevel = {
				start: parseInt(activityLevelStart),
				end: parseInt(activityLevelEnd)
			};
		}

		// Fetch activity report data
		const data = await getActivityReportRequest(params as IActivityRequestParams);

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Error fetching activity report:', error);

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
