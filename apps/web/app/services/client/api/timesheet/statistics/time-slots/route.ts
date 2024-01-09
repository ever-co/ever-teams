import { get } from '@app/services/client/axios';

export async function getTimerLogsRequestAPI({
	tenantId,
	organizationId,
	employeeId,
	todayEnd,
	todayStart
}: {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	todayEnd: Date;
	todayStart: Date;
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId,
		todayEnd: todayEnd.toISOString(),
		todayStart: todayStart.toISOString()
	};
	const query = new URLSearchParams(params);
	const endpoint = `/timesheet/statistics/time-slots?${query.toString()}`;

	const data = await get(endpoint, true);

	return data;
}
