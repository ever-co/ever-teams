import { get } from '../../axios';

export async function getTimerLogs(tenantId: string, organizationId: string, employeeId: string) {
	const endpoint = `/timesheet/statistics/time-slots?tenantId=${tenantId}&organizationId=${organizationId}&todayStart=2024-01-08 22:00:00&todayEnd=2024-01-09 21:59:59&startDate=2024-01-07 22:00:00&endDate=2024-01-14 21:59:59&employeeIds[0]=${employeeId}`;

	const data = await get(endpoint, true, { tenantId });

	return data;
}
