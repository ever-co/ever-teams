import { getTaskTimesheetRequest } from '@/core/services/server/requests';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');
	if (!startDate || !endDate) {
		return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
	}
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');
	try {
		const { data } = await getTaskTimesheetRequest(
			{
				tenantId,
				organizationId,
				startDate,
				endDate
			},
			access_token
		);

		if (!data) {
			return NextResponse.json({ error: 'No data found' }, { status: 404 });
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching timesheet:', error);
		return NextResponse.json({ error: 'Failed to fetch timesheet data' }, { status: 500 });
	}
}
