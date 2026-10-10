import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';
import { getTimeLogReportWeeklyRequest } from '@/core/services/server/requests';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { searchParams } = new URL(req.url);

	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');

	if (!startDate || !endDate) {
		return NextResponse.json(
			{ error: 'Missing required parameters: startDate and endDate are required' },
			{ status: 400 }
		);
	}

	const { user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	// The client sends arrays as indexed keys (projectIds[0], projectIds[1], ...)
	const listParam = (name: string) =>
		Array.from(searchParams.entries())
			.filter(([key]) => key.startsWith(`${name}[`))
			.map(([, value]) => value);

	try {
		const { data } = await getTimeLogReportWeeklyRequest(
			{
				tenantId,
				organizationId,
				startDate,
				endDate,
				timeZone: searchParams.get('timeZone') || undefined,
				projectIds: listParam('projectIds'),
				employeeIds: listParam('employeeIds'),
				teamIds: listParam('teamIds')
			},
			access_token
		);

		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching weekly report:', error);
		return NextResponse.json({ error: 'Failed to fetch weekly report' }, { status: 500 });
	}
}
