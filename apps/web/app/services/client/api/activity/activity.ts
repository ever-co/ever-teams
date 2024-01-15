import { get } from '@app/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { ITimerApps } from '@app/interfaces/timer/ITimerApp';

export async function getTimerDailyRequestAPI({
	tenantId,
	organizationId,
	employeeId,
	todayEnd,
	todayStart,
	type,
	title
}: {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	todayEnd: Date;
	todayStart: Date;
	type: string;
	title?: string;
}) {
	const params: {
		tenantId: string;
		organizationId: string;
		'employeeIds[0]': string;
		startDate: string;
		endDate: string;
		'types[0]': string;
		'title[0]'?: string;
	} = {
		tenantId: tenantId,
		organizationId: organizationId,
		'employeeIds[0]': employeeId,
		startDate: todayStart.toISOString(),
		endDate: todayEnd.toISOString(),
		'types[0]': type
	};
	if (title) params['title[0]'] = title;
	const query = new URLSearchParams(params);
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/activity/daily?${query.toString()}`
		: `/timer/daily?${query.toString()}`;

	return get<ITimerApps[]>(endpoint);
}
