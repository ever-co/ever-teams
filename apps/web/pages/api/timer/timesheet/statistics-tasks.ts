import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { tasksTimesheetStatisticsRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, organizationId, access_token, taskId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const activeTask = req.query.activeTask;
	const employeeId = req.query.employeeId as string | undefined;

	if (activeTask && !taskId) {
		return $res.json({
			global: [],
			today: [],
		});
	}

	const { data } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			'employeeIds[0]': employeeId || user.employee.id,
			defaultRange: 'false',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {}),
		},
		access_token
	);

	const { data: todayData } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			'employeeIds[0]': user.employee.id,
			defaultRange: 'true',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {}),
			unitOfTime: 'day',
		},
		access_token
	);

	return $res.json({
		global: data,
		today: todayData,
	});
}
