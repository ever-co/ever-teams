import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { tasksTimesheetStatisticsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	try {
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
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The time worked on the tasks could not be read.');
	}
}
