import { ITaskTimesheet } from '@app/interfaces';
import { get } from '@app/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import qs from 'qs';

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
	const query = qs.stringify(params);

	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/activity?${query}` : `/timer/timesheet?${query}`;

	return get<ITaskTimesheet[]>(endpoint);
}
