import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { IActivityLog, IActivityLogUpdatedValues } from '@/core/types/interfaces/common/activity-log';
import { IComment } from '@/core/types/interfaces/common/comment';
import { IAuthoredRecord, IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { TaskActivityChange, TaskActivityItem, TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';

const DISPLAY_NAME_KEYS = ['name', 'title', 'fullName'] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The tenant and organization the API services send, or `null` before the session cookies exist. */
export function taskDiscussionScope(): IEntityRecordScope | null {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	if (!tenantId || !organizationId) {
		return null;
	}

	return { tenantId, organizationId };
}

function firstFilled(candidates: ReadonlyArray<unknown>): string | null {
	for (const candidate of candidates) {
		if (typeof candidate !== 'string') {
			continue;
		}
		const trimmed = candidate.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}

	return null;
}

function authorNameOf(record: IAuthoredRecord): string {
	const candidates = [record.employee?.fullName, record.employee?.user?.name, record.createdByUser?.name];
	const name = firstFilled(candidates);

	return name ?? '';
}

function authorImageUrlOf(record: IAuthoredRecord): string | null {
	const candidates = [record.employee?.user?.imageUrl, record.createdByUser?.imageUrl];

	return firstFilled(candidates);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	return !Array.isArray(value);
}

function holdsField(entry: unknown, field: string): boolean {
	if (!isRecord(entry)) {
		return false;
	}

	return Object.hasOwn(entry, field);
}

function fieldValueIn(entries: IActivityLogUpdatedValues[] | null | undefined, field: string): unknown {
	if (!Array.isArray(entries)) {
		return undefined;
	}
	const entry = entries.find((candidate) => holdsField(candidate, field));

	return entry?.[field];
}

function displayTextOf(text: string): string | null {
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return null;
	}
	// A foreign key (`taskStatusId`, `projectId`) is not something to show: its relation object carries the name.
	if (UUID_PATTERN.test(trimmed)) {
		return null;
	}

	return trimmed;
}

function displayNumberOf(value: number): string | null {
	if (!Number.isFinite(value)) {
		return null;
	}

	return String(value);
}

function displayNameOf(record: Record<string, unknown>): string | null {
	const candidates = DISPLAY_NAME_KEYS.map((key) => record[key]);

	return firstFilled(candidates);
}

function displayValueOf(value: unknown): string | null {
	if (typeof value === 'string') {
		return displayTextOf(value);
	}
	if (typeof value === 'number') {
		return displayNumberOf(value);
	}
	if (isRecord(value)) {
		return displayNameOf(value);
	}

	return null;
}

function changeOf(log: IActivityLog, field: unknown): TaskActivityChange | null {
	if (typeof field !== 'string') {
		return null;
	}
	const previousValue = fieldValueIn(log.previousValues, field);
	const updatedValue = fieldValueIn(log.updatedValues, field);
	const from = displayValueOf(previousValue);
	const to = displayValueOf(updatedValue);
	// Gauzy compares with `!==` (activity-log.helper.ts): an object, an array or a date the client sent back
	// unchanged is logged as an update, and reads the same on both sides once reduced.
	if (from === to) {
		return null;
	}

	return { field, from, to };
}

function changesOf(log: IActivityLog): TaskActivityChange[] {
	const fields = log.updatedFields;
	if (!Array.isArray(fields)) {
		return [];
	}
	const changes: TaskActivityChange[] = [];
	for (const field of fields) {
		const change = changeOf(log, field);
		if (change) {
			changes.push(change);
		}
	}

	return changes;
}

function dateOrNull(value: string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function resolverNameOf(comment: IComment): string {
	const employee = comment.resolvedByEmployee;
	const name = firstFilled([employee?.fullName, employee?.user?.name]);
	return name ?? '';
}

export function toTaskCommentItem(comment: IComment): TaskCommentItem {
	return {
		id: comment.id,
		body: comment.comment,
		createdAt: new Date(comment.createdAt),
		parentId: comment.parentId ?? null,
		authorName: authorNameOf(comment),
		authorImageUrl: authorImageUrlOf(comment),
		authorEmployeeId: comment.employeeId ?? null,
		authorUserId: comment.createdByUserId ?? null,
		editedAt: dateOrNull(comment.editedAt),
		resolved: comment.resolved === true,
		resolvedAt: dateOrNull(comment.resolvedAt),
		resolvedByName: resolverNameOf(comment)
	};
}

export function toTaskActivityItem(log: IActivityLog): TaskActivityItem {
	return {
		id: log.id,
		action: log.action,
		createdAt: new Date(log.createdAt),
		actorName: authorNameOf(log),
		actorImageUrl: authorImageUrlOf(log),
		changes: changesOf(log)
	};
}
