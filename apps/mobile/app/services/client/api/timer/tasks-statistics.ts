import { IParamsStatistic } from '../../../interfaces/ITask';
import { currentAuthenticatedUserRequest } from '../../requests/auth';
import { tasksTimesheetStatisticsRequest } from '../../requests/timesheet';

export async function tasksStatistics(params: IParamsStatistic) {
	const { taskId, bearer_token, organizationId, tenantId, activeTask } = params;

	if (activeTask && !taskId) {
		return {
			data: {
				global: [],
				today: []
			}
		};
	}

	const { data: user } = await currentAuthenticatedUserRequest({ bearer_token });

	const { data } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			'employeeIds[0]': user.employee.id,
			defaultRange: 'false',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {})
		},
		bearer_token
	);

	const { data: todayData } = await tasksTimesheetStatisticsRequest(
		{
			tenantId,
			organizationId,
			'employeeIds[0]': user.employee.id,
			defaultRange: 'true',
			...(activeTask && taskId ? { 'taskIds[0]': taskId } : {}),
			unitOfTime: 'day'
		},
		bearer_token
	);

	return {
		data: {
			global: data,
			today: todayData
		}
	};
}
