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
	updatedFields?: string[] | string | null;
	previousValues?: Array<Record<string, unknown>> | string | null;
	updatedValues?: Array<Record<string, unknown>> | string | null;
	/** The names of the records an id points at, as they were when the change was recorded. */
	previousEntities?: Array<Record<string, unknown>> | string | null;
	updatedEntities?: Array<Record<string, unknown>> | string | null;
	/** `employeeId`: the entry's owner; `reason`: the reason the person gave. */
	data?: Record<string, unknown> | string | null;
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
