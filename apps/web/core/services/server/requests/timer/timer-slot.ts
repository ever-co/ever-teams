import qs from 'qs';
import { serverFetch } from '../../fetch';
import { ITimerSlotDataRequest, ITimeSlot } from '@/core/types/interfaces/timer/time-slot/time-slot';

export function getEmployeeTimeSlotsRequest({
	bearer_token,
	tenantId,
	organizationId,
	todayEnd,
	todayStart,
	employeeId,
	teamIds = []
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	todayEnd: Date;
	todayStart: Date;
	employeeId: string;
	teamIds?: string[];
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		startDate: todayStart.toISOString(),
		endDate: todayEnd.toISOString()
	} as Record<string, string>;

	// Gauzy filters this endpoint by employeeIds only: its validation strips an employeeId parameter
	if (employeeId) {
		params['employeeIds[0]'] = employeeId;
	}
	teamIds.forEach((teamId, index) => {
		params[`teamIds[${index}]`] = teamId;
	});

	const relations = ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId'];

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});
	const query = qs.stringify(params);

	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

/**
 * The employee's own time slots that start between `startDate` and `endDate`, both included, of runs started between
 * them too: Gauzy reads no others. What a window of a catch-up write holds, read from its run's start (#5123).
 */
export function getEmployeeWindowTimeSlotsRequest({
	bearer_token,
	tenantId,
	organizationId,
	employeeId,
	startDate,
	endDate
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	employeeId: string;
	startDate: Date;
	endDate: Date;
}) {
	const query = qs.stringify(
		{
			tenantId,
			organizationId,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			employeeIds: [employeeId]
		},
		{ arrayFormat: 'indices' }
	);

	return serverFetch<ITimeSlot[]>({
		path: `/timesheet/time-slot?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteEmployeeTimeSlotsRequest({
	bearer_token,
	tenantId,
	organizationId,
	ids,
	forceDelete
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	ids: string[];
	forceDelete?: boolean;
}) {
	const query = qs.stringify({ tenantId, organizationId, ids, forceDelete }, { arrayFormat: 'indices' });

	return serverFetch<boolean>({
		path: `/timesheet/time-slot?${query}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
