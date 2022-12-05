import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { tasksTimesheetStatisticsRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, organizationId, access_token } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const date = req.query.date;

	const { data } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			'employeeIds[0]': user.employee.id,
		},
		access_token
	);

	if (date) {
		const { data: todayData } = await tasksTimesheetStatisticsRequest(
			{
				tenantId,
				organizationId,
				'employeeIds[0]': user.employee.id,
				startDate: `${date} 00:00`,
				endDate: `${date} 23:59`,
			},
			access_token
		);
		return $res.json({
			global: data,
			today: todayData,
		});
	}

	$res.json({
		global: data,
	});
}
