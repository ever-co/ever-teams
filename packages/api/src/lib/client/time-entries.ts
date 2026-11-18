import { ITimeLog } from '@ever-teams/toolkit-types';
import { EverTeamsDate, localTimeZone, rangeOf } from './dates';
import { Identity } from './identity';
import { Transport } from './transport';

export interface TimeEntriesListParams {
	from: EverTeamsDate;
	to: EverTeamsDate;
	/** The members whose entries to list; without it, those of every member the token may see. */
	employeeIds?: string[];
}

export interface TimeEntriesResource {
	/** GET /timesheet/time-log: the entries started from `from` to `to`, with their project, task, client and member. */
	list(params: TimeEntriesListParams): Promise<ITimeLog[]>;
}

// The relations the kit's time log reads ask, so each entry has the shape of ITimeLog.
const RELATIONS = ['project', 'task', 'organizationContact', 'employee.user'];

export function createTimeEntries(transport: Transport, identity: Identity): TimeEntriesResource {
	async function list(params: TimeEntriesListParams): Promise<ITimeLog[]> {
		const range = rangeOf(params.from, params.to);
		const { tenantId, organizationId } = await identity.scope();
		// Instants with their zone: the API reads startDate and endDate as UTC.
		const query = {
			activityLevel: { start: 0, end: 100 },
			organizationId,
			tenantId,
			startDate: range.start.toISOString(),
			endDate: range.end.toISOString(),
			timeZone: localTimeZone(),
			relations: RELATIONS,
			employeeIds: params.employeeIds
		};
		return transport.request<ITimeLog[]>({
			method: 'GET',
			path: '/timesheet/time-log',
			query,
			tenantId,
			organizationId
		});
	}

	return { list };
}
