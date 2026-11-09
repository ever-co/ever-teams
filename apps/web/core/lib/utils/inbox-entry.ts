import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import {
	EInboxItemKind,
	EInboxItemSource,
	EInboxTab,
	IInboxItem,
	INBOX_NOTIFICATION_EXTERNAL_SOURCE
} from '@/core/types/interfaces/common/inbox-item';
import { readRuntimeEnv } from '@/env-config';
import { NotificationEntry, quotedSubjectOf, senderNameFromTitle } from './notification-inbox';

/** The families an entry is grouped and filtered by. */
export type InboxSourceGroup = 'tasks' | 'chat' | 'docs' | 'email' | 'integrations' | 'people' | 'other';

export const INBOX_SOURCE_GROUPS: readonly InboxSourceGroup[] = ['tasks', 'chat', 'docs', 'email', 'integrations', 'people', 'other'];

/** The list's own filters: the platform tabs plus the type filters the bell has. */
export type InboxFilter = 'all' | 'unread' | 'mentions' | 'assigned' | 'snoozed' | 'done' | 'archived';

export const INBOX_PRIMARY_FILTERS: readonly InboxFilter[] = ['all', 'unread', 'mentions', 'assigned'];
export const INBOX_SECONDARY_FILTERS: readonly InboxFilter[] = ['snoozed', 'done', 'archived'];

/** An inbox item as the page draws it. */
export interface InboxEntry {
	id: string;
	kind: string;
	source: string;
	sourceGroup: InboxSourceGroup;
	/** The notification type, when the item is a platform notification of a known type. */
	type: EEmployeeNotificationType | null;
	/** The platform's own title, shown as is when nothing better can be read from it. */
	rawTitle: string;
	/** The task, team or broadcast title quoted in the title. */
	subject: string | null;
	message: string | null;
	senderName: string | null;
	sentByEmployeeId: string | null;
	entity: string | null;
	entityId: string | null;
	taskId: string | null;
	/** Where opening the entry leads when it is not about a task. */
	href: string | null;
	isUnread: boolean;
	isArchived: boolean;
	isDone: boolean;
	snoozedUntil: Date | null;
	createdAt: Date;
	/** A decision (question, approval, escalation) still waiting for an answer. */
	awaitsDecision: boolean;
	/** A decision's choices, whether an answer needs a reason, and the answer given; null for anything else. */
	decision: InboxDecision | null;
}

/** What the detail pane answers a decision with. */
export interface InboxDecision {
	options: ReadonlyArray<{ id: string; label: string; description: string | null; recommended: boolean }>;
	requireReason: boolean;
	response: { text: string | null; optionId: string | null; answeredAt: Date | null } | null;
}

/** A rate change request is answered in Members settings. */
const RATE_CHANGE_REQUEST_HREF = '/settings/team/members';

const KNOWN_TYPES: ReadonlyArray<string> = Object.values(EEmployeeNotificationType);

function knownTypeOf(value: unknown): EEmployeeNotificationType | null {
	return typeof value === 'string' && KNOWN_TYPES.includes(value) ? (value as EEmployeeNotificationType) : null;
}

function stringOf(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function dateOf(value: string | null | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? date : null;
}

/** Which family an item belongs to, from its kind, source and the record it points at. */
export function sourceGroupOf(item: Pick<IInboxItem, 'kind' | 'source' | 'entity' | 'taskId'>, type: EEmployeeNotificationType | null): InboxSourceGroup {
	if (item.kind === EInboxItemKind.Email || item.source === EInboxItemSource.Email) return 'email';
	if (item.source === EInboxItemSource.EverWorks) return 'integrations';
	const entity = String(item.entity ?? '');
	if (item.taskId || entity === EBaseEntityEnum.Task || entity === 'Comment') return 'tasks';
	if (entity === 'ChatMessage' || entity === 'ChatConversation' || type === EEmployeeNotificationType.Message) return 'chat';
	if (entity === 'Document' || entity === 'DocumentLink') return 'docs';
	if (type === EEmployeeNotificationType.Invitation || type === EEmployeeNotificationType.RateChangeRequest || entity === 'Employee') return 'people';
	if (type === EEmployeeNotificationType.Assignment || type === EEmployeeNotificationType.Mention || type === EEmployeeNotificationType.Comment) return 'tasks';
	return 'other';
}

/** Whether this deployment has the chat pages (`/chat/:conversationId`), which a conversation entry opens. */
export function hasChatPages(): boolean {
	return (readRuntimeEnv('NEXT_PUBLIC_CHAT_ENABLED') || process.env.NEXT_PUBLIC_CHAT_ENABLED) === 'true';
}

function hrefOf(type: EEmployeeNotificationType | null, entry: Pick<InboxEntry, 'entity' | 'entityId'>): string | null {
	if (type === EEmployeeNotificationType.RateChangeRequest) return RATE_CHANGE_REQUEST_HREF;
	// Without the chat pages a conversation has nowhere to open: the entry is not a link.
	if (entry.entity === 'ChatConversation' && entry.entityId && hasChatPages()) return `/chat/${entry.entityId}`;
	return null;
}

/** An entry from a platform inbox item. */
export function toInboxEntry(item: IInboxItem): InboxEntry {
	const metadata = item.metadata ?? {};
	const isNotification = item.kind === EInboxItemKind.Notification || item.externalSource === INBOX_NOTIFICATION_EXTERNAL_SOURCE;
	const type = isNotification ? knownTypeOf(metadata['notificationType']) : null;
	const rawTitle = stringOf(item.title) ?? '';
	const subject = isNotification ? quotedSubjectOf(rawTitle) : null;
	const message = stringOf(item.body);
	const recipient = item.recipient;
	const entity = stringOf(item.entity);
	const entityId = stringOf(item.entityId);
	const taskId = stringOf(item.taskId) ?? (entity === EBaseEntityEnum.Task ? entityId : null);
	const entry: InboxEntry = {
		id: item.id,
		kind: String(item.kind ?? ''),
		source: String(item.source ?? ''),
		sourceGroup: sourceGroupOf(item, type),
		type,
		rawTitle,
		subject,
		message: message && message !== subject && message !== rawTitle ? message : null,
		senderName: isNotification ? senderNameFromTitle(rawTitle) : null,
		sentByEmployeeId: stringOf(metadata['sentByEmployeeId']),
		entity,
		entityId,
		taskId,
		href: null,
		isUnread: recipient ? recipient.isRead !== true : true,
		isArchived: !!recipient?.isArchived,
		isDone: !!(recipient?.doneAt || recipient?.isDone),
		snoozedUntil: dateOf(recipient?.snoozedUntil),
		createdAt: new Date(item.createdAt),
		awaitsDecision:
			(item.kind === EInboxItemKind.Question || item.kind === EInboxItemKind.Approval || item.kind === EInboxItemKind.Escalation) &&
			String(item.status ?? '') === 'OPEN',
		decision: decisionOf(item)
	};
	entry.href = hrefOf(type, entry);
	return entry;
}

/** The decision part of an item: a question, an approval or an escalation; null for anything else. */
export function decisionOf(item: Pick<IInboxItem, 'kind' | 'options' | 'requireReason' | 'response'>): InboxDecision | null {
	const isDecision = item.kind === EInboxItemKind.Question || item.kind === EInboxItemKind.Approval || item.kind === EInboxItemKind.Escalation;
	if (!isDecision) return null;
	const response = item.response ?? null;
	return {
		options: (item.options ?? [])
			.filter((option) => !!option?.id && !!option.label)
			.map((option) => ({ id: option.id, label: option.label, description: option.description ?? null, recommended: !!option.recommended })),
		requireReason: !!item.requireReason,
		response: response
			? { text: response.text ?? null, optionId: response.optionId ?? null, answeredAt: response.answeredAt ? new Date(response.answeredAt) : null }
			: null
	};
}

/** What an answer would send, or why it cannot be sent yet: an option where there are options, a reason where one is asked. */
export function replyOf(decision: InboxDecision, choice: { optionId: string | null; text: string }): { input: { optionId?: string; text?: string } } | { missing: 'option' | 'reason' | 'answer' } {
	const text = choice.text.trim();
	if (decision.options.length > 0 && !choice.optionId) return { missing: 'option' };
	if (decision.requireReason && !text) return { missing: 'reason' };
	if (decision.options.length === 0 && !text) return { missing: 'answer' };
	return { input: { ...(choice.optionId ? { optionId: choice.optionId } : {}), ...(text ? { text } : {}) } };
}

/** An entry from the bell's own data, for a platform without the inbox extension (read, unread and archive only). */
export function fromNotificationEntry(notification: NotificationEntry): InboxEntry {
	const entry: InboxEntry = {
		id: notification.id,
		kind: EInboxItemKind.Notification,
		source: EInboxItemSource.Gauzy,
		sourceGroup: 'other',
		type: notification.type,
		rawTitle: notification.rawTitle,
		subject: notification.subject,
		message: notification.message,
		senderName: notification.senderName,
		sentByEmployeeId: null,
		entity: notification.taskId ? EBaseEntityEnum.Task : null,
		entityId: notification.taskId,
		taskId: notification.taskId,
		href: notification.href,
		isUnread: notification.isUnread,
		isArchived: false,
		isDone: false,
		snoozedUntil: null,
		createdAt: notification.createdAt,
		awaitsDecision: false,
		decision: null
	};
	entry.sourceGroup = sourceGroupOf({ kind: entry.kind, source: entry.source, entity: entry.entity, taskId: entry.taskId }, entry.type);
	return entry;
}

/** The platform tab a filter reads from (the type filters read the All tab and narrow on the client). */
export function tabOfFilter(filter: InboxFilter): EInboxTab {
	switch (filter) {
		case 'snoozed':
			return EInboxTab.Snoozed;
		case 'done':
			return EInboxTab.Done;
		case 'archived':
			return EInboxTab.Archived;
		default:
			return EInboxTab.All;
	}
}

/** Whether an entry's state places it under a filter: snoozed, done and archived entries live in their own lists. */
export function belongsToFilter(entry: Pick<InboxEntry, 'isArchived' | 'isDone' | 'snoozedUntil'>, filter: InboxFilter, now: Date = new Date()): boolean {
	const snoozed = !!entry.snoozedUntil && entry.snoozedUntil.getTime() > now.getTime();
	if (filter === 'archived') return entry.isArchived;
	if (entry.isArchived) return false;
	if (filter === 'done') return entry.isDone;
	if (entry.isDone) return false;
	if (filter === 'snoozed') return snoozed;
	return !snoozed;
}

/** Whether an entry belongs under a filter (the client-side narrowing of a page). */
export function matchesInboxFilter(entry: InboxEntry, filter: InboxFilter, sourceGroup: InboxSourceGroup | null = null): boolean {
	if (sourceGroup && entry.sourceGroup !== sourceGroup) return false;
	if (!belongsToFilter(entry, filter)) return false;
	switch (filter) {
		case 'unread':
			return entry.isUnread;
		case 'mentions':
			return entry.type === EEmployeeNotificationType.Mention;
		case 'assigned':
			return entry.type === EEmployeeNotificationType.Assignment;
		default:
			return true;
	}
}

export function filterInboxEntries(entries: readonly InboxEntry[], filter: InboxFilter, sourceGroup: InboxSourceGroup | null = null): InboxEntry[] {
	return entries.filter((entry) => matchesInboxFilter(entry, filter, sourceGroup));
}

/** The snooze presets of the row and the keyboard. */
export type SnoozePreset = 'laterToday' | 'tomorrow' | 'nextWeek';

export const SNOOZE_PRESETS: readonly SnoozePreset[] = ['laterToday', 'tomorrow', 'nextWeek'];

const MORNING_HOUR = 9;

function atHour(date: Date, hour: number): Date {
	const at = new Date(date);
	at.setHours(hour, 0, 0, 0);
	return at;
}

/**
 * When a snoozed entry comes back: later today (three hours on, or tomorrow morning when that is past 20:00),
 * tomorrow at nine, or next Monday at nine — in the reader's local time.
 */
export function snoozeUntil(preset: SnoozePreset, now: Date = new Date()): Date {
	if (preset === 'laterToday') {
		const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
		if (later.getDate() !== now.getDate() || later.getHours() >= 20) {
			const tomorrow = new Date(now);
			tomorrow.setDate(now.getDate() + 1);
			return atHour(tomorrow, MORNING_HOUR);
		}
		return later;
	}
	if (preset === 'tomorrow') {
		const tomorrow = new Date(now);
		tomorrow.setDate(now.getDate() + 1);
		return atHour(tomorrow, MORNING_HOUR);
	}
	const monday = new Date(now);
	const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
	monday.setDate(now.getDate() + daysUntilMonday);
	return atHour(monday, MORNING_HOUR);
}

export type InboxDayGroup = 'today' | 'yesterday' | 'earlier';

export interface InboxGroup {
	day: InboxDayGroup;
	entries: InboxEntry[];
}

function startOfDay(date: Date): number {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day.getTime();
}

export function dayGroupOf(createdAt: Date, now: Date): InboxDayGroup {
	const today = startOfDay(now);
	const day = startOfDay(createdAt);
	if (day >= today) return 'today';
	// The previous calendar day, not 24 hours back: a day around a daylight-saving change lasts 23 or 25 hours.
	const previous = new Date(now);
	previous.setDate(previous.getDate() - 1);
	if (day >= startOfDay(previous)) return 'yesterday';
	return 'earlier';
}

/** The entries by day, in the order given (newest first), empty groups left out. */
export function groupInboxEntriesByDay(entries: readonly InboxEntry[], now: Date): InboxGroup[] {
	const groups = new Map<InboxDayGroup, InboxEntry[]>();
	for (const entry of entries) {
		const day = dayGroupOf(entry.createdAt, now);
		groups.set(day, [...(groups.get(day) ?? []), entry]);
	}
	return (['today', 'yesterday', 'earlier'] as const).filter((day) => groups.has(day)).map((day) => ({ day, entries: groups.get(day) ?? [] }));
}

/** The next row to focus for J / K (down / up), staying inside the list. */
export function nextFocusIndex(current: number, count: number, direction: 1 | -1): number {
	if (count <= 0) return -1;
	if (current < 0) return direction === 1 ? 0 : count - 1;
	return Math.min(count - 1, Math.max(0, current + direction));
}
