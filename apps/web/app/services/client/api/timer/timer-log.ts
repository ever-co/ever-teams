import { ITimeSheet, ITimerStatus } from '@app/interfaces';
import { get, deleteApi } from '../../axios';

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
	timeZone,
	projectIds = [],
	employeeIds = []
}: {
	organizationId: string,
	tenantId: string,
	startDate: string | Date,
	endDate: string | Date,
	timeZone?: string,
	projectIds?: string[],
	employeeIds?: string[]
}) {

	if (!organizationId || !tenantId || !startDate || !endDate) {
		throw new Error('Required parameters missing: organizationId, tenantId, startDate, and endDate are required');
	}
	const start = typeof startDate === 'string' ? new Date(startDate).toISOString() : startDate.toISOString();
	const end = typeof endDate === 'string' ? new Date(endDate).toISOString() : endDate.toISOString();
	if (isNaN(new Date(start).getTime()) || isNaN(new Date(end).getTime())) {
		throw new Error('Invalid date format provided');
	}
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
		'relations[3]': 'employee.user',
		'relations[4]': 'task.taskStatus'
	});

	projectIds.forEach((id, index) => {
		params.append(`projectIds[${index}]`, id);
	});

	employeeIds.forEach((id, index) => {
		params.append(`employeeIds[${index}]`, id);
	});
	const endpoint = `/timesheet/time-log?${params.toString()}`;
	return get<ITimeSheet[]>(endpoint, { tenantId });
}


export async function deleteTaskTimesheetLogsApi({
	logIds,
	organizationId,
	tenantId
}: {
	organizationId: string,
	tenantId: string,
	logIds: ITimeSheet[]
}) {
	// Validate required parameters
	if (!organizationId || !tenantId || !logIds?.length) {
		throw new Error('Required parameters missing: organizationId, tenantId, and logIds are required');
	}

	// Limit bulk deletion size for safety
	if (logIds.length > 100) {
		throw new Error('Maximum 100 logs can be deleted at once');
	}

	const params = new URLSearchParams({
		organizationId,
		tenantId
	});
	logIds.forEach((items, index) => {
		if (!items) {
			throw new Error(`Invalid logId at index ${index}`);
		}
		params.append(`logIds[${index}]`, items.id);
	});

	const endPoint = `/timesheet/time-log?${params.toString()}`;
	try {
		return await deleteApi<{ success: boolean; message: string }>(endPoint, { tenantId });
	} catch (error) {
		throw new Error(`Failed to delete timesheet logs`);
	}
}
