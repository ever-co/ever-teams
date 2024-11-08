import { ITimeSheet, ITimerStatus } from '@app/interfaces';
import { get } from '../../axios';

export async function getTimerLogs(
	tenantId: string,
	organizationId: string,
	employeeId: string,
	organizationTeamId: string | null
) {
	const endpoint = `/timer/status?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}&employeeIds[0]=${employeeId}`;

	return get<ITimerStatus>(endpoint, { tenantId });
}

// todayStart, todayEnd;


export async function getTaskTimesheetLogsApi({
	organizationId,
	tenantId,
	startDate,
	endDate,
	timeZone
}: {
	organizationId: string,
	tenantId: string,
	startDate: string | Date,
	endDate: string | Date,
	timeZone?: string
}) {
	const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
	const end = typeof endDate === 'string' ? endDate : endDate.toISOString();

	const params = new URLSearchParams({
		'activityLevel[start]': '0',
		'activityLevel[end]': '100',
		organizationId,
		tenantId,
		startDate: start,
		endDate: end,
		timeZone: timeZone || '',
		'relations[0]': 'project',
		'relations[1]': 'task',
		'relations[2]': 'organizationContact',
		'relations[3]': 'employee.user'
	});

	const endpoint = `/timesheet/time-log?${params.toString()}`;
	return get<ITimeSheet[]>(endpoint, { tenantId });
}
