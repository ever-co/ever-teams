import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';
import { getTimeLogReportDailyChartRequest } from '@/core/services/server/requests';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	// Get all required parameters from the URL
	const activityLevelStart = searchParams.get('activityLevel[start]');
	const activityLevelEnd = searchParams.get('activityLevel[end]');
	const organizationId = searchParams.get('organizationId');
	const tenantId = searchParams.get('tenantId');
	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');
	const timeZone = searchParams.get('timeZone');
	const groupBy = searchParams.get('groupBy');

	// Validate required parameters
	if (!startDate || !endDate || !organizationId || !tenantId) {
		return NextResponse.json(
			{
				error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
			},
			{ status: 400 }
		);
	}

	// Authenticate the request
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
		// Make the request to get daily chart data
		const { data } = await getTimeLogReportDailyChartRequest(
			{
				activityLevel: {
					start: parseInt(activityLevelStart || '0'),
					end: parseInt(activityLevelEnd || '100')
				},
				organizationId,
				tenantId,
				startDate,
				endDate,
				timeZone: timeZone || 'Etc/UTC',
				groupBy: groupBy || 'date'
			},
			access_token
		);

		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching daily chart data:', error);
		return NextResponse.json({ error: 'Failed to fetch daily chart data' }, { status: 500 });
	}
}
