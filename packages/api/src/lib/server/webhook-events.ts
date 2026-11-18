/**
 * What every webhook delivery's body holds around its data, as the API writes it (Gauzy, webhook-outbox.consumer.ts,
 * bodyOf). A delivery is sent at least once: handle each `id` once.
 */
export interface EverTeamsWebhookEnvelope {
	/** The event's id, the same on every attempt to deliver it (the `X-Event-Id` header). */
	id: string;
	/** `<aggregate>.<action>`, as in the `X-Event` header: `time_log.started`. */
	name: string;
	/** The version of the data's contract. */
	version: number;
	/** When it happened, as an ISO date. */
	occurredAt: string;
	tenantId?: string;
	organizationId?: string;
	channelId?: string;
	/** The record that changed: `{ type: 'TIME_LOG', id }` for a time entry. */
	aggregate?: { type: string; id: string };
	/** The order of the events of one record. */
	sequence?: number;
	partitionKey?: string;
	correlationId?: string;
	causationId?: string;
	producer?: string;
	data: unknown;
}

/**
 * The events of a time entry (Gauzy, time-log-facts.service.ts): a timer start, a timer stop (another start, or a run
 * closed for being left open, included), an entry added already finished (by hand, a tracker or an integration),
 * another change (its range, project, task or employee), and a deletion (a discarded timer included).
 */
export type EverTeamsTimeEntryEventName =
	| 'time_log.started'
	| 'time_log.stopped'
	| 'time_log.created'
	| 'time_log.updated'
	| 'time_log.deleted';

/** A time entry as its event tells it: its ids and times, never its description. */
export interface EverTeamsTimeEntryData {
	timeLogId: string;
	employeeId: string | null;
	projectId: string | null;
	taskId: string | null;
	/** The client of the entry's project. */
	organizationContactId: string | null;
	organizationTeamId: string | null;
	/** An ISO date. */
	startedAt: string | null;
	/** An ISO date. */
	stoppedAt: string | null;
	isRunning: boolean | null;
	isBillable: boolean | null;
	/** Where it was tracked: `BROWSER`, `DESKTOP`, `MOBILE`, `TEAMS`, `EMBED`, ... */
	source: string | null;
	/** `TRACKED`, `MANUAL`, `IDLE`, `RESUMED` or `BREAK`. */
	logType: string | null;
}

type TimeEntryEventNamed<Name extends EverTeamsTimeEntryEventName> = EverTeamsWebhookEnvelope & {
	name: Name;
	data: EverTeamsTimeEntryData;
};

/** An event of a time entry, one member per name. */
export type EverTeamsTimeEntryEvent = {
	[Name in EverTeamsTimeEntryEventName]: TimeEntryEventNamed<Name>;
}[EverTeamsTimeEntryEventName];

/** An event this version of the SDK does not type, with its data as the API sent it. */
export interface EverTeamsOtherWebhookEvent extends EverTeamsWebhookEnvelope {
	data: unknown;
}

/** What verifyWebhook answers: tell a time entry's event apart with `isTimeEntryEvent`, then by its `name`. */
export type EverTeamsWebhookEvent = EverTeamsTimeEntryEvent | EverTeamsOtherWebhookEvent;

const TIME_ENTRY_EVENT_NAMES: readonly string[] = [
	'time_log.started',
	'time_log.stopped',
	'time_log.created',
	'time_log.updated',
	'time_log.deleted'
];

const ID_FIELDS = [
	'employeeId',
	'projectId',
	'taskId',
	'organizationContactId',
	'organizationTeamId',
	'startedAt',
	'stoppedAt',
	'source',
	'logType'
];

const FLAG_FIELDS = ['isRunning', 'isBillable'];

const isRecord = (value: unknown): value is { [key: string]: unknown } =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isTextOrNull = (value: unknown): boolean => value === null || typeof value === 'string';

const isFlagOrNull = (value: unknown): boolean => value === null || typeof value === 'boolean';

// Every field the API writes for a time entry, each of its type: an event of another shape stays untyped.
function isTimeEntryData(data: unknown): data is EverTeamsTimeEntryData {
	if (!isRecord(data)) {
		return false;
	}
	const hasId = typeof data['timeLogId'] === 'string';
	const hasIds = ID_FIELDS.every((field) => isTextOrNull(data[field]));
	const hasFlags = FLAG_FIELDS.every((field) => isFlagOrNull(data[field]));
	return hasId && hasIds && hasFlags;
}

/**
 * Whether an event verifyWebhook answered is a time entry's, with its data typed.
 *
 * @example
 * if (isTimeEntryEvent(event) && event.name === 'time_log.started') {
 * 	await notifyPortal(event.data.employeeId, event.data.startedAt);
 * }
 */
export function isTimeEntryEvent(event: EverTeamsWebhookEvent): event is EverTeamsTimeEntryEvent {
	const isNamed = TIME_ENTRY_EVENT_NAMES.indexOf(event.name) >= 0;
	return isNamed && isTimeEntryData(event.data);
}
