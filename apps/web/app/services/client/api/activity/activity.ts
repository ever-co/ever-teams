import { get } from '@app/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { ITimerApps } from '@app/interfaces/timer/ITimerApp';

export async function getTimerDailyRequestAPI({
	tenantId,
	organizationId,
	employeeId,
	todayEnd,
	todayStart,
	type
}: {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	todayEnd: Date;
	todayStart: Date;
	type: string;
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		'employeeIds[0]': employeeId,
		startDate: todayStart.toISOString(),
		endDate: todayEnd.toISOString(),
		'types[0]': type
	};
	const query = new URLSearchParams(params);
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/activity/daily?${query.toString()}`
		: `/timer/daily?${query.toString()}`;

	return get<ITimerApps[]>(endpoint);
}
