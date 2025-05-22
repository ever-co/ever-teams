import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';
import { getTimesheetStatisticsCountsRequest } from '@/core/services/server/requests';
import { TimeLogType } from '@/core/types/interfaces/to-review';

const isValidLogType = (type: string): type is TimeLogType => {
	return ['TRACKED', 'MANUAL', 'IDLE'].includes(type as TimeLogType);
};

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	// Get required parameters from the URL
	const activityLevelStart = searchParams.get('activityLevel[start]');
	const activityLevelEnd = searchParams.get('activityLevel[end]');
	const organizationId = searchParams.get('organizationId');
	const tenantId = searchParams.get('tenantId');
	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');
	const timeZone = searchParams.get('timeZone');

	// Get log types from URL and validate them
	const logTypes = Array.from({ length: 10 }, (_, i) => searchParams.get(`logType[${i}]`))
		.filter((logType): logType is string => logType !== null)
		.filter(isValidLogType);

	// Validate required parameters
	if (!startDate || !endDate || !organizationId || !tenantId) {
		return NextResponse.json(
			{
				error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
			},
			{ status: 400 }
		);
	}

	if (logTypes.length === 0) {
		return NextResponse.json(
			{
				error: 'At least one valid logType is required (TRACKED, MANUAL, or IDLE)'
			},
			{ status: 400 }
		);
	}

	// Authenticate the request
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
		// Make the request to get statistics counts
		const { data } = await getTimesheetStatisticsCountsRequest(
			{
				activityLevel: {
					start: parseInt(activityLevelStart || '0'),
					end: parseInt(activityLevelEnd || '100')
				},
				logType: logTypes,
				organizationId,
				tenantId,
				startDate,
				endDate,
				timeZone: timeZone || 'Etc/UTC'
			},
			access_token
		);

		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching timesheet statistics counts:', error);
		return NextResponse.json({ error: 'Failed to fetch timesheet statistics counts' }, { status: 500 });
	}
}
