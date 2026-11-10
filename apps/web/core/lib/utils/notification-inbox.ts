import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType, IEmployeeNotification } from '@/core/types/interfaces/common/employee-notification';

export type NotificationFilter = 'all' | 'unread' | 'mentions' | 'assigned';

export const NOTIFICATION_FILTERS: readonly NotificationFilter[] = ['all', 'unread', 'mentions', 'assigned'];

/** A notification as the inbox draws it: the sentence is rebuilt in the reader's language from these parts. */
export interface NotificationEntry {
	id: string;
	type: EEmployeeNotificationType | null;
	isUnread: boolean;
	senderName: string | null;
	senderImageUrl: string | null;
	/** The task, team or broadcast title Gauzy quoted in its English title. */
	subject: string | null;
	/** Gauzy's own title, shown as is when the type is unknown or the subject cannot be read. */
	rawTitle: string;
	message: string | null;
	taskId: string | null;
	/** Where opening the notification leads when it is not about a task. */
	href: string | null;
	createdAt: Date;
}

/** A rate change request is answered in Members settings, where an admin edits the member's rate. */
const RATE_CHANGE_REQUEST_HREF = '/settings/team/members';

/** The verbs of Gauzy's title templates (`employee-notification.helper.ts`), in the order they are tried. */
const TITLE_ACTION_WORDS = [
	' Assigned ',
	' Mentioned ',
	' Commented ',
	' Invited ',
	' published ',
	' sent ',
	' replied ',
	' asked for '
];

function firstFilled(candidates: ReadonlyArray<string | null | undefined>): string | null {
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

/** The task, team or broadcast title the platform quoted in its English title. */
export function quotedSubjectOf(title: string): string | null {
	const opening = title.indexOf('"');
	const closing = title.lastIndexOf('"');
	const hasQuotedPart = opening >= 0 && closing > opening;
	if (!hasQuotedPart) {
		return null;
	}
	const subject = title.slice(opening + 1, closing).trim();
	if (subject.length === 0) {
		return null;
	}

	return subject;
}

/** The actor's name, read off the platform's English title (`Ana Assigned you …`). */
export function senderNameFromTitle(title: string): string | null {
	for (const word of TITLE_ACTION_WORDS) {
		const position = title.indexOf(word);
		if (position <= 0) {
			continue;
		}

		return firstFilled([title.slice(0, position)]);
	}

	return null;
}

function knownTypeOf(value: IEmployeeNotification['type']): EEmployeeNotificationType | null {
	const knownTypes: ReadonlyArray<string> = Object.values(EEmployeeNotificationType);
	if (typeof value !== 'string') {
		return null;
	}
	if (!knownTypes.includes(value)) {
		return null;
	}

	return value as EEmployeeNotificationType;
}

function hrefOf(type: EEmployeeNotificationType | null): string | null {
	const isRateChangeRequest = type === EEmployeeNotificationType.RateChangeRequest;
	if (isRateChangeRequest) {
		return RATE_CHANGE_REQUEST_HREF;
	}
	return null;
}

function taskIdOf(notification: IEmployeeNotification): string | null {
	const pointsAtTask = notification.entity === EBaseEntityEnum.Task;
	if (!pointsAtTask) {
		return null;
	}

	return notification.entityId ?? null;
}

/** A broadcast repeats its title as the message: shown once. */
function distinctMessageOf(notification: IEmployeeNotification, subject: string | null): string | null {
	const message = firstFilled([notification.message]);
	if (message === null) {
		return null;
	}
	if (message === subject) {
		return null;
	}

	return message;
}

export function toNotificationEntry(notification: IEmployeeNotification): NotificationEntry {
	const rawTitle = firstFilled([notification.title]) ?? '';
	const sender = notification.sentByEmployee;
	const senderName = firstFilled([sender?.fullName, sender?.user?.name, senderNameFromTitle(rawTitle)]);
	const subject = quotedSubjectOf(rawTitle);
	const type = knownTypeOf(notification.type);

	return {
		id: notification.id,
		type,
		isUnread: notification.isRead !== true,
		senderName,
		senderImageUrl: firstFilled([sender?.user?.imageUrl]),
		subject,
		rawTitle,
		message: distinctMessageOf(notification, subject),
		taskId: taskIdOf(notification),
		href: hrefOf(type),
		createdAt: new Date(notification.createdAt)
	};
}

function matchesFilter(entry: NotificationEntry, filter: NotificationFilter): boolean {
	if (filter === 'unread') {
		return entry.isUnread;
	}
	if (filter === 'mentions') {
		return entry.type === EEmployeeNotificationType.Mention;
	}
	if (filter === 'assigned') {
		return entry.type === EEmployeeNotificationType.Assignment;
	}

	return true;
}

export function filterNotificationEntries(
	entries: readonly NotificationEntry[],
	filter: NotificationFilter
): NotificationEntry[] {
	return entries.filter((entry) => matchesFilter(entry, filter));
}

export function countUnreadEntries(entries: readonly NotificationEntry[]): number {
	return entries.filter((entry) => entry.isUnread).length;
}

export type NotificationDayGroup = 'today' | 'yesterday' | 'earlier';

export interface NotificationGroup {
	group: NotificationDayGroup;
	entries: NotificationEntry[];
}

function startOfDay(date: Date): number {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);

	return copy.getTime();
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function dayGroupOf(createdAt: Date, now: Date): NotificationDayGroup {
	const today = startOfDay(now);
	const createdDay = startOfDay(createdAt);
	if (createdDay >= today) {
		return 'today';
	}
	if (createdDay >= today - DAY_IN_MS) {
		return 'yesterday';
	}

	return 'earlier';
}

/** Entries arrive newest first; the groups keep that order and skip the empty ones. */
export function groupNotificationEntriesByDay(
	entries: readonly NotificationEntry[],
	now: Date = new Date()
): NotificationGroup[] {
	const groups: NotificationGroup[] = [];
	for (const entry of entries) {
		const group = dayGroupOf(entry.createdAt, now);
		const last = groups.at(-1);
		const continuesLastGroup = last?.group === group;
		if (continuesLastGroup) {
			last.entries.push(entry);
			continue;
		}
		groups.push({ group, entries: [entry] });
	}

	return groups;
}

const AGE_UNITS: ReadonlyArray<[Intl.NumberFormatOptions['unit'], number]> = [
	['day', DAY_IN_MS],
	['hour', 60 * 60 * 1000],
	['minute', 60 * 1000]
];

const WEEK_IN_MS = 7 * DAY_IN_MS;

/**
 * Linear's compact age in the reader's locale: "now", "5m", "2h", "3d", then the date ("25 Oct") after a week.
 */
export function formatNotificationAge(createdAt: Date, locale: string, now: Date = new Date()): string {
	const elapsed = now.getTime() - createdAt.getTime();
	if (elapsed >= WEEK_IN_MS) {
		return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(createdAt);
	}
	for (const [unit, size] of AGE_UNITS) {
		if (elapsed < size) {
			continue;
		}
		const amount = Math.floor(elapsed / size);

		return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(amount);
	}

	return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second');
}

/** The full date and time, for the age's tooltip. */
export function formatNotificationDate(createdAt: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(createdAt);
}
