import type { ITimeLogHistoryRow } from '@/core/types/interfaces/timer/time-log/time-log-history';

/** A row's action: added by hand, edited, or deleted. */
export type TimeLogHistoryAction = 'created' | 'updated' | 'deleted';

/** The fields a time entry's history records, in the order a change reads them. */
export const HISTORY_FIELDS = [
	'startedAt',
	'stoppedAt',
	'duration',
	'taskId',
	'projectId',
	'organizationContactId',
	'organizationTeamId',
	'employeeId',
	'isBillable',
	'description',
	'status'
] as const;

export type TimeLogHistoryField = (typeof HISTORY_FIELDS)[number];

export type HistoryValue = string | number | boolean | null;

/** One field of a change, with the names of the records an id pointed at when the change was recorded. */
export interface HistoryFieldChange {
	field: TimeLogHistoryField;
	before: HistoryValue;
	after: HistoryValue;
	beforeName: string | null;
	afterName: string | null;
}

/** One change of an entry: who made it, when, why, and each field before and after. */
export interface TimeLogHistoryChange {
	id: string;
	entryId: string;
	at: Date;
	action: TimeLogHistoryAction;
	/** The employee of the person who made the change, when they have one. */
	authorEmployeeId: string | null;
	authorUserId: string | null;
	/** The member whose entry it is. */
	ownerEmployeeId: string | null;
	reason: string | null;
	fields: HistoryFieldChange[];
}

/** The kinds of change the Manual time edits report filters by. */
export const CHANGE_KIND_VALUES = ['time', 'task-project', 'billable', 'deleted'] as const;

export type ChangeKindValue = (typeof CHANGE_KIND_VALUES)[number];

const KIND_FIELDS: ReadonlyArray<{ kind: ChangeKindValue; fields: ReadonlyArray<TimeLogHistoryField> }> = [
	{ kind: 'time', fields: ['startedAt', 'stoppedAt', 'duration'] },
	{ kind: 'task-project', fields: ['taskId', 'projectId', 'organizationContactId'] },
	{ kind: 'billable', fields: ['isBillable'] }
];

const ACTIONS: Readonly<Record<string, TimeLogHistoryAction>> = {
	Created: 'created',
	Updated: 'updated',
	Deleted: 'deleted'
};

/**
 * Statuses an API without the history routes answers: no route (404, 405), or `history` read as an entry id (400, or
 * 406 from its id check).
 */
const UNSUPPORTED_STATUSES = new Set([400, 404, 405, 406]);

/** SQLite answers the JSON columns as text. */
function parsedOf(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value;
	}
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function listOf(value: unknown): Array<Record<string, unknown>> {
	const parsed = parsedOf(value);
	if (!Array.isArray(parsed)) {
		return [];
	}
	return parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

function stringListOf(value: unknown): string[] {
	const parsed = parsedOf(value);
	if (!Array.isArray(parsed)) {
		return [];
	}
	return parsed.filter((item): item is string => typeof item === 'string');
}

function objectOf(value: unknown): Record<string, unknown> {
	const parsed = parsedOf(value);
	const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
	if (!isObject) {
		return {};
	}
	return parsed as Record<string, unknown>;
}

function historyValueOf(value: unknown): HistoryValue {
	const isPlain = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
	if (!isPlain) {
		return null;
	}
	return value;
}

/** `[{ field: value }, ...]` into one record. */
function valuesOf(list: ReadonlyArray<Record<string, unknown>>): Map<string, HistoryValue> {
	const values = new Map<string, HistoryValue>();
	for (const item of list) {
		for (const [field, value] of Object.entries(item)) {
			values.set(field, historyValueOf(value));
		}
	}
	return values;
}

/** `[{ field: { id, name } }, ...]` into the name of each field. */
function namesOf(list: ReadonlyArray<Record<string, unknown>>): Map<string, string> {
	const names = new Map<string, string>();
	for (const item of list) {
		for (const [field, entity] of Object.entries(item)) {
			const name = objectOf(entity).name;
			if (typeof name === 'string' && name.trim().length > 0) {
				names.set(field, name.trim());
			}
		}
	}
	return names;
}

function textOrNull(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const text = value.trim();
	if (text.length === 0) {
		return null;
	}
	return text;
}

function fieldChangesOf(row: ITimeLogHistoryRow): HistoryFieldChange[] {
	const changed = new Set(stringListOf(row.updatedFields));
	const before = valuesOf(listOf(row.previousValues));
	const after = valuesOf(listOf(row.updatedValues));
	const beforeNames = namesOf(listOf(row.previousEntities));
	const afterNames = namesOf(listOf(row.updatedEntities));
	const fields: HistoryFieldChange[] = [];
	for (const field of HISTORY_FIELDS) {
		if (!changed.has(field)) {
			continue;
		}
		fields.push({
			field,
			before: before.get(field) ?? null,
			after: after.get(field) ?? null,
			beforeName: beforeNames.get(field) ?? null,
			afterName: afterNames.get(field) ?? null
		});
	}
	return fields;
}

function changeOf(row: ITimeLogHistoryRow): TimeLogHistoryChange | null {
	const at = new Date(row.createdAt);
	const hasDate = !Number.isNaN(at.getTime());
	const action = ACTIONS[row.action];
	const isReadable = hasDate && Boolean(action) && Boolean(row.entityId);
	if (!isReadable) {
		return null;
	}
	const data = objectOf(row.data);
	return {
		id: row.id,
		entryId: row.entityId,
		at,
		action,
		authorEmployeeId: row.employeeId ?? null,
		authorUserId: row.createdByUserId ?? null,
		ownerEmployeeId: textOrNull(data.employeeId),
		reason: textOrNull(data.reason),
		fields: fieldChangesOf(row)
	};
}

function newestFirst(first: TimeLogHistoryChange, second: TimeLogHistoryChange) {
	return second.at.getTime() - first.at.getTime();
}

/** The changes of some history rows, newest first; a row that cannot be read is left out. */
export function historyChangesOf(rows: ReadonlyArray<ITimeLogHistoryRow>): TimeLogHistoryChange[] {
	const changes: TimeLogHistoryChange[] = [];
	for (const row of rows) {
		const change = changeOf(row);
		if (change) {
			changes.push(change);
		}
	}
	return changes.sort(newestFirst);
}

/** The kinds of one change: what it touched, or `deleted`; adding an entry by hand changes nothing yet. */
export function changeKindsOf(change: TimeLogHistoryChange): ChangeKindValue[] {
	if (change.action === 'deleted') {
		return ['deleted'];
	}
	if (change.action === 'created') {
		return [];
	}
	const changedFields = new Set(change.fields.map((field) => field.field));
	const kinds: ChangeKindValue[] = [];
	for (const { kind, fields } of KIND_FIELDS) {
		const touched = fields.some((field) => changedFields.has(field));
		if (touched) {
			kinds.push(kind);
		}
	}
	return kinds;
}

/** Every kind of an entry's changes, once each, in the filter's order. */
export function entryChangeKindsOf(changes: ReadonlyArray<TimeLogHistoryChange>): ChangeKindValue[] {
	const found = new Set<ChangeKindValue>();
	for (const change of changes) {
		for (const kind of changeKindsOf(change)) {
			found.add(kind);
		}
	}
	return CHANGE_KIND_VALUES.filter((kind) => found.has(kind));
}

/** The changes of a period by entry, each list newest first. */
export function changesByEntryOf(changes: ReadonlyArray<TimeLogHistoryChange>): Map<string, TimeLogHistoryChange[]> {
	const byEntry = new Map<string, TimeLogHistoryChange[]>();
	for (const change of [...changes].sort(newestFirst)) {
		const list = byEntry.get(change.entryId) ?? [];
		list.push(change);
		byEntry.set(change.entryId, list);
	}
	return byEntry;
}

/** The field a one-line summary shows: the duration when it changed ("2 h -> 5 h"), else the first field. */
export function headlineFieldOf(change: TimeLogHistoryChange): HistoryFieldChange | null {
	const duration = change.fields.find((field) => field.field === 'duration');
	if (duration) {
		return duration;
	}
	return change.fields[0] ?? null;
}

/** How a page writes values: its clock, its durations, its words. */
export interface HistoryValueFormat {
	time: (date: Date) => string;
	duration: (seconds: number) => string;
	yes: string;
	no: string;
	none: string;
	statusLabel: (status: string) => string;
	memberName: (employeeId: string) => string | null;
}

function timeTextOf(value: HistoryValue, format: HistoryValueFormat) {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return format.none;
	}
	return format.time(date);
}

/** One value of a change as the page shows it. */
export function historyValueTextOf(
	field: TimeLogHistoryField,
	value: HistoryValue,
	name: string | null,
	format: HistoryValueFormat
): string {
	if (value === null || value === '') {
		return format.none;
	}
	if (field === 'startedAt' || field === 'stoppedAt') {
		return timeTextOf(value, format);
	}
	if (field === 'duration') {
		return format.duration(Number(value));
	}
	if (field === 'isBillable') {
		if (value === true) {
			return format.yes;
		}
		return format.no;
	}
	if (field === 'status') {
		return format.statusLabel(String(value));
	}
	if (name) {
		return name;
	}
	if (field === 'employeeId') {
		return format.memberName(String(value)) ?? format.none;
	}
	return String(value);
}

/** One side of a change for a file, each field with its label: "End 14:00; Duration 5h 00m". */
export function changeSideTextOf(
	change: TimeLogHistoryChange,
	side: 'before' | 'after',
	format: HistoryValueFormat,
	labelOf: (field: TimeLogHistoryField) => string
): string {
	const parts = change.fields.map((field) => {
		const isBefore = side === 'before';
		let value = field.after;
		let name = field.afterName;
		if (isBefore) {
			value = field.before;
			name = field.beforeName;
		}
		const text = historyValueTextOf(field.field, value, name, format);
		return `${labelOf(field.field)} ${text}`;
	});
	return parts.join('; ');
}

/** What a deleted entry was, read from its deletion. */
export interface DeletedEntry {
	entryId: string;
	deletedAt: Date;
	startedAt: Date | null;
	stoppedAt: Date | null;
	employeeId: string | null;
	projectId: string | null;
	projectName: string | null;
	taskId: string | null;
	taskTitle: string | null;
	isBillable: boolean;
	description: string | null;
	reason: string | null;
}

function fieldOf(change: TimeLogHistoryChange, field: TimeLogHistoryField) {
	return change.fields.find((item) => item.field === field);
}

function dateValueOf(change: TimeLogHistoryChange, field: TimeLogHistoryField): Date | null {
	const value = fieldOf(change, field)?.before;
	if (typeof value !== 'string') {
		return null;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date;
}

function textValueOf(change: TimeLogHistoryChange, field: TimeLogHistoryField): string | null {
	return textOrNull(fieldOf(change, field)?.before);
}

/** The entry a deletion removed, with its values before deletion; `null` for any other change. */
export function deletedEntryOf(change: TimeLogHistoryChange): DeletedEntry | null {
	if (change.action !== 'deleted') {
		return null;
	}
	return {
		entryId: change.entryId,
		deletedAt: change.at,
		startedAt: dateValueOf(change, 'startedAt'),
		stoppedAt: dateValueOf(change, 'stoppedAt'),
		employeeId: textValueOf(change, 'employeeId') ?? change.ownerEmployeeId,
		projectId: textValueOf(change, 'projectId'),
		projectName: fieldOf(change, 'projectId')?.beforeName ?? null,
		taskId: textValueOf(change, 'taskId'),
		taskTitle: fieldOf(change, 'taskId')?.beforeName ?? null,
		isBillable: fieldOf(change, 'isBillable')?.before === true,
		description: textValueOf(change, 'description'),
		reason: change.reason
	};
}

/** An answer that means the API has no history routes yet: the pages then behave as before them. */
export function isHistoryUnsupportedStatus(status: number | undefined): boolean {
	if (status === undefined) {
		return false;
	}
	return UNSUPPORTED_STATUSES.has(status);
}
