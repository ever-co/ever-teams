import { ITaskTimesheet } from '@app/interfaces';
import { get } from '@app/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';

export async function getTaskTimesheetRequestAPI({
	taskId,
	tenantId,
	organizationId,
	defaultRange,
	unitOfTime
}: {
	tenantId: string;
	organizationId: string;
	defaultRange?: string;
	taskId?: string;
	unitOfTime?: 'day';
}) {
	const params: {
		tenantId: string;
		organizationId: string;
		defaultRange?: string;
		'taskIds[0]'?: string;
		unitOfTime?: 'day';
	} = {
		'taskIds[0]': taskId,
		tenantId,
		organizationId,
		defaultRange,
		unitOfTime
	};
	const query = new URLSearchParams(params);
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/activity?${query.toString()}`
		: `/timer/timesheet?${query.toString()}`;

	return get<ITaskTimesheet[]>(endpoint);
}
