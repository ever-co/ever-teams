import { serverFetch } from '../../fetch';
import { ITimerSlotDataRequest } from '@app/interfaces/timer/ITimerSlot';

export function getEmployeeDailyRequest({
	bearer_token,
	tenantId,
	organizationId,
	todayEnd,
	todayStart,
	employeeId,
	type,
	activityLevel
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	todayEnd: Date;
	todayStart: Date;
	employeeId: string;
	type: string;
	activityLevel: { start: number; end: number };
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		'employeeIds[0]': employeeId,
		startDate: todayStart.toISOString(),
		endDate: todayEnd.toISOString(),
		'types[0]': type,
		'activityLevel[start]': activityLevel.start.toString(),
		'activityLevel[end]': activityLevel.end.toString()
	};

	const query = new URLSearchParams(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/activity/daily?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
