import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { tasksTimesheetStatisticsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const response = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			employeeIds: [],
			defaultRange: 'false'
		},
		access_token
	);

	return $res(response.data);
}
