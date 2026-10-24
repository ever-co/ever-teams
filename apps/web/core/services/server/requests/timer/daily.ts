import qs from 'qs';
import { serverFetch } from '../../fetch';
import { ITimerSlotDataRequest } from '@/core/types/interfaces/timer/time-slot/time-slot';

export function getEmployeeDailyRequest({
	bearer_token,
	tenantId,
	organizationId,
	todayEnd,
	todayStart,
	employeeId,
	type,
	title,
	activityLevel
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	todayEnd?: Date;
	todayStart?: Date;
	employeeId: string;
	type?: string;
	title?: string;
	activityLevel: { start: number; end: number };
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		'employeeIds[0]': employeeId,
		startDate: todayStart?.toISOString(),
		endDate: todayEnd?.toISOString(),
		'types[0]': type,
		'title[0]': title,
		'activityLevel[start]': activityLevel.start.toString(),
		'activityLevel[end]': activityLevel.end.toString()
	};

	const query = qs.stringify(params);

	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/activity/daily?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
