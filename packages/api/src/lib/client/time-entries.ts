import { LogType, TimerSource } from '@ever-teams/toolkit-types';
import { billableFieldsOf } from '../billable';
import { EverTeamsDate, instantAt, localTimeZone, rangeOf } from './dates';
import { clientError, NextStepsByStatus } from './error-mapping';
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
	/** Only the entries of the token's own member, whatever employeeIds names. */
	mine?: boolean;
}

export interface TimeEntryCreateParams {
	/** When the time starts: a Date or an ISO date-time. */
	startedAt: Date | string;
	/** When it stops: a Date or an ISO date-time after startedAt. */
	stoppedAt: Date | string;
	projectId?: string;
	taskId?: string;
	organizationTeamId?: string;
	description?: string;
	/** Why the time is added by hand, kept with the entry. */
	reason?: string;
	/**
	 * Whether the time is billable. Left out, it is billable as its project is set, as in the web app; time without a
	 * project is not billable, as before.
	 */
	isBillable?: boolean;
}

export interface TimeEntriesResource {
	/** GET /timesheet/time-log: the entries started from `from` to `to`, with their project, task, client and member. */
	list(params: TimeEntriesListParams): Promise<EverTeamsTimeEntry[]>;
	/**
	 * POST /timesheet/time-log: adds a past entry of the token's member, from `startedAt` to `stoppedAt`, and answers
	 * its time log. The API refuses it (403) when the organization does not allow manual time.
	 */
	create(params: TimeEntryCreateParams): Promise<EverTeamsTimeLog>;
}

// The relations the kit's time log reads ask, and the client of each entry's project, so each entry has the shape of
// EverTeamsTimeEntry.
const RELATIONS = ['project', 'project.organizationContact', 'task', 'organizationContact', 'employee.user'];

type ClientRecord = { id: string; name: string; imageUrl?: string | null };

// A time log as the API answers it: the project's client comes with the client's whole record.
type TimeLogAnswer = Omit<EverTeamsTimeEntry, 'project' | 'organizationContact'> & {
	project: (NonNullable<EverTeamsTimeEntry['project']> & { organizationContact?: ClientRecord | null }) | null;
	organizationContact: ClientRecord | null;
};

// Only the fields the entry type gives: the API answers the whole record (billing e-mail, budget...).
function clientOf(record: ClientRecord | null | undefined): EverTeamsTimeEntry['organizationContact'] {
	if (!record) {
		return null;
	}
	return { id: record.id, name: record.name, imageUrl: record.imageUrl ?? null };
}

// The entry's own client when it has one, else its project's, as the web app names it (#5593). Time entries do not
// record a client of their own today.
function entryOf(answer: TimeLogAnswer): EverTeamsTimeEntry {
	const ownClient = clientOf(answer.organizationContact);
	const projectClient = clientOf(answer.project?.organizationContact);
	let project: EverTeamsTimeEntry['project'] = null;
	if (answer.project) {
		const fields = { ...answer.project };
		delete fields.organizationContact;
		project = fields;
	}
	return { ...answer, project, organizationContact: ownClient ?? projectClient };
}

// The API answers 403 when the organization does not allow manual time, or the member's role may not add it, and 409
// when the range overlaps a timer still running (RUNNING_TIMER_OVERLAP) or a break (BREAK_OVERLAP).
const MANUAL_TIME_STEPS: NextStepsByStatus = {
	403:
		"The organization does not allow time added by hand, or the token's member may not add it: ask an " +
		'administrator of the organization to allow manual time.',
	409:
		'The range overlaps a running timer or a break (error.code names which): stop the timer, or choose another ' +
		'range.'
};

function createdRangeOf(params: TimeEntryCreateParams): { start: Date; end: Date } {
	const start = instantAt(params.startedAt);
	const end = instantAt(params.stoppedAt);
	if (end.getTime() <= start.getTime()) {
		throw clientError(
			'INVALID_DATE',
			`${String(params.stoppedAt)} is not after ${String(params.startedAt)}.`,
			'Pass a stoppedAt after startedAt.'
		);
	}
	return { start, end };
}

export function createTimeEntries(transport: Transport, identity: Identity): TimeEntriesResource {
	async function employeeIdsOf(params: TimeEntriesListParams): Promise<string[] | undefined> {
		if (!params.mine) {
			return params.employeeIds;
		}
		const { employeeId } = await identity.member();
		return [employeeId];
	}

	async function list(params: TimeEntriesListParams): Promise<EverTeamsTimeEntry[]> {
		const range = rangeOf(params.from, params.to);
		const { tenantId, organizationId } = await identity.scope();
		const employeeIds = await employeeIdsOf(params);
		// Instants with their zone: the API reads startDate and endDate as UTC.
		const query = {
			activityLevel: { start: 0, end: 100 },
			organizationId,
			tenantId,
			startDate: range.start.toISOString(),
			endDate: range.end.toISOString(),
			timeZone: localTimeZone(),
			relations: RELATIONS,
			employeeIds
		};
		const answers = await transport.request<TimeLogAnswer[]>({
			method: 'GET',
			path: '/timesheet/time-log',
			query,
			tenantId,
			organizationId
		});
		return answers.map(entryOf);
	}

	async function create(params: TimeEntryCreateParams): Promise<EverTeamsTimeLog> {
		const range = createdRangeOf(params);
		const { tenantId, organizationId, employeeId } = await identity.member();
		// Only the fields the API's manual time DTO declares. It records an entry added by hand as BROWSER whatever the
		// body names, and an older API keeps the source sent: BROWSER is one every version knows.
		const body = {
			tenantId,
			organizationId,
			employeeId,
			startedAt: range.start.toISOString(),
			stoppedAt: range.end.toISOString(),
			logType: LogType.MANUAL,
			source: TimerSource.BROWSER,
			projectId: params.projectId,
			taskId: params.taskId,
			organizationTeamId: params.organizationTeamId,
			description: params.description,
			reason: params.reason,
			...billableFieldsOf(params.isBillable)
		};
		return transport.request<EverTeamsTimeLog>({
			method: 'POST',
			path: '/timesheet/time-log',
			body,
			tenantId,
			organizationId,
			nextSteps: MANUAL_TIME_STEPS
		});
	}

	return { list, create };
}
