import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { tasksTimesheetStatisticsRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { data } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			employeeIds: [],
			defaultRange: 'false'
		},
		access_token
	);

	return $res.json(data);
}
