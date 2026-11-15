/** A JSON column of an activity log row: parsed on PostgreSQL and MySQL, text on SQLite, or nothing. */
type JsonColumn<T> = T | string | null;

/**
 * One row of a time entry's history as Gauzy answers it (`GET /timesheet/time-log/:id/history` and
 * `GET /timesheet/time-log/history`): an activity log row whose entity is `TimeLog`. On SQLite the JSON fields can
 * arrive as text; the readers parse them.
 */
export interface ITimeLogHistoryRow {
	id: string;
	entityId: string;
	/** `Created` (added by hand), `Updated` or `Deleted`. */
	action: string;
	createdAt: string;
	updatedFields?: JsonColumn<string[]>;
	previousValues?: JsonColumn<Array<Record<string, unknown>>>;
	updatedValues?: JsonColumn<Array<Record<string, unknown>>>;
	/** The names of the records an id points at, as they were when the change was recorded. */
	previousEntities?: JsonColumn<Array<Record<string, unknown>>>;
	updatedEntities?: JsonColumn<Array<Record<string, unknown>>>;
	/** `employeeId`: the entry's owner; `reason`: the reason the person gave. */
	data?: JsonColumn<Record<string, unknown>>;
	/** The employee of the person who made the change, when they have one. */
	employeeId?: string | null;
	createdByUserId?: string | null;
}

/** A page of the changes of a period. */
export interface ITimeLogHistoryPage {
	items: ITimeLogHistoryRow[];
	total: number;
}

/** The kinds of change Gauzy can filter a period's history by. */
export enum ETimeLogChangeKind {
	CREATED = 'CREATED',
	TIME = 'TIME',
	TASK = 'TASK',
	PROJECT = 'PROJECT',
	MEMBER = 'MEMBER',
	BILLABLE = 'BILLABLE',
	NOTES = 'NOTES',
	STATUS = 'STATUS',
	DELETED = 'DELETED'
}
