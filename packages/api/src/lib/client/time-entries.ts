import { EverTeamsDate, localTimeZone, rangeOf } from './dates';
import { Identity } from './identity';
import { EverTeamsMember, EverTeamsMemberUser } from './members';
import { EverTeamsProject } from './projects';
import { EverTeamsTask } from './tasks';
import { EverTeamsTimeLog } from './timer';
import { Transport } from './transport';

/**
 * A time log with the relations the client asks for, each with the fields the API selects for a time entry: its
 * project, task and client (null when it has none) and its member.
 */
export interface EverTeamsTimeEntry extends EverTeamsTimeLog {
	project: (Pick<EverTeamsProject, 'id' | 'name' | 'imageUrl'> & { color: string | null }) | null;
	task: Omit<EverTeamsTask, 'projectId' | 'parentId' | 'public' | 'isDraft' | 'createdAt' | 'updatedAt'> | null;
	organizationContact: { id: string; name: string; imageUrl: string | null } | null;
	employee: Pick<EverTeamsMember, 'id' | 'fullName' | 'isOnline' | 'isAway'> & {
		user: Pick<EverTeamsMemberUser, 'id' | 'firstName' | 'lastName' | 'name' | 'imageUrl'>;
	};
}

export interface TimeEntriesListParams {
	from: EverTeamsDate;
	to: EverTeamsDate;
	/** The members whose entries to list; without it, those of every member the token may see. */
	employeeIds?: string[];
}

export interface TimeEntriesResource {
	/** GET /timesheet/time-log: the entries started from `from` to `to`, with their project, task, client and member. */
	list(params: TimeEntriesListParams): Promise<EverTeamsTimeEntry[]>;
}

// The relations the kit's time log reads ask, so each entry has the shape of EverTeamsTimeEntry.
const RELATIONS = ['project', 'task', 'organizationContact', 'employee.user'];

export function createTimeEntries(transport: Transport, identity: Identity): TimeEntriesResource {
	async function list(params: TimeEntriesListParams): Promise<EverTeamsTimeEntry[]> {
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
		return transport.request<EverTeamsTimeEntry[]>({
			method: 'GET',
			path: '/timesheet/time-log',
			query,
			tenantId,
			organizationId
		});
	}

	return { list };
}
