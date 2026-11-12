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
import { timerReminderNoticeOf, type TimerReminderNotice } from '@/core/lib/notifications/timer-reminders';
import { docsInboxHrefOf, isDocsInboxEntry } from './docs-links';
import { isDocsEnabled } from './docs-enabled';
import { NotificationEntry, quotedSubjectOf, senderNameFromTitle, TIMER_REMINDER_HREF } from './notification-inbox';

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
	/** The task, team or broadcast title quoted in the title; for a chat entry, the channel it happened in (`#general`). */
	subject: string | null;
	/** The body of the item; for a chat entry, the text of the message. */
	message: string | null;
	senderName: string | null;
	sentByEmployeeId: string | null;
	entity: string | null;
	entityId: string | null;
	taskId: string | null;
	/** The chat message the entry is about: opening it resolves the conversation and scrolls to the message. */
	chatMessageId: string | null;
	/** Where opening the entry leads when it is not about a task. */
	href: string | null;
	/** A reminder of a timer left running: its level, the hours it names and its run, read in the reader's language. */
	timerReminder: TimerReminderNotice | null;
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
export function sourceGroupOf(
	item: Pick<IInboxItem, 'kind' | 'source' | 'entity' | 'taskId'> & { metadata?: Record<string, unknown> | null },
	type: EEmployeeNotificationType | null
): InboxSourceGroup {
	if (item.kind === EInboxItemKind.Email || item.source === EInboxItemSource.Email) return 'email';
	if (item.source === EInboxItemSource.EverWorks) return 'integrations';
	const entity = String(item.entity ?? '');
	// A comment on a page (the platform names its record in the metadata) is a Docs entry, not a task's.
	if (!item.taskId && isDocsInboxEntry(entity, item.metadata ?? null)) return 'docs';
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

/** Whether an entry has something to open: its task, its link, or its chat message where the chat pages exist. */
export function hasInboxTarget(entry: Pick<InboxEntry, 'taskId' | 'href' | 'chatMessageId'>, chatPages = hasChatPages()): boolean {
	return !!entry.taskId || !!entry.href || (!!entry.chatMessageId && chatPages);
}

/** Where an entry is opened: on a large screen beside the list (the pane), on a phone over it (a sheet) or by its target. */
interface InboxOpenView {
	/** The pane is on screen (the large breakpoint). */
	hasPane: boolean;
	/** The person asked to go to the target (`Enter`, a clicked browser notification), not only to read the entry. */
	follow: boolean;
	chatPages: boolean;
}

/**
 * Whether opening an entry also goes to its target. A task always opens (its drawer, over the inbox); otherwise only
 * when asked to follow, or on a phone, where there is no pane to read it in — unless it is a question answered here.
 * An entry with nothing to open never leaves the inbox.
 */
export function opensInboxTarget(entry: Pick<InboxEntry, 'taskId' | 'href' | 'chatMessageId' | 'decision'>, view: InboxOpenView): boolean {
	if (!hasInboxTarget(entry, view.chatPages)) return false;
	if (entry.taskId || view.follow) return true;
	return !view.hasPane && !entry.decision;
}

/**
 * Whether the opened entry is shown in the sheet over the list below the large breakpoint: a question answered here,
 * or an entry with nothing to open, which would otherwise show nothing at all on a phone.
 */
export function showsInboxSheet(entry: Pick<InboxEntry, 'taskId' | 'href' | 'chatMessageId' | 'decision'> | null, chatPages: boolean): boolean {
	if (!entry) return false;
	return !!entry.decision || !hasInboxTarget(entry, chatPages);
}

function hrefOf(type: EEmployeeNotificationType | null, entry: Pick<InboxEntry, 'entity' | 'entityId'>, metadata: Record<string, unknown> | null = null): string | null {
	if (type === EEmployeeNotificationType.RateChangeRequest) return RATE_CHANGE_REQUEST_HREF;
	if (type === EEmployeeNotificationType.TimerReminder) return TIMER_REMINDER_HREF;
	// Without the chat pages a conversation has nowhere to open: the entry is not a link.
	if (entry.entity === 'ChatConversation' && entry.entityId && hasChatPages()) return `/chat/${entry.entityId}`;
	// A page, or a comment on one (its thread), opens in Docs where the deployment has it.
	if (isDocsEnabled()) {
		const docsHref = docsInboxHrefOf(entry.entity, entry.entityId, metadata, type === EEmployeeNotificationType.Comment);
		if (docsHref) return docsHref;
	}
	return null;
}

/**
 * What the platform's English title of a chat notification says besides who and what: the channel (`… in #general: …`)
 * and the text of the message (everything after the first `: `). A direct message names no channel.
 */
export function messagePartsOfTitle(title: string): { place: string | null; preview: string | null } {
	const colon = title.indexOf(': ');
	const head = colon >= 0 ? title.slice(0, colon) : title;
	const preview = colon >= 0 ? title.slice(colon + 2).trim() : '';
	const place = /\sin (#[^\s:]+)$/.exec(head)?.[1] ?? null;
	return { place, preview: preview.length > 0 ? preview : null };
}

/** What an entry is about: the channel of a chat message, the channel a mention names, else the title's quoted part. */
function subjectOf(entity: string | null, chatParts: { place: string | null } | null, quoted: string | null): string | null {
	if (chatParts) return chatParts.place;
	if (entity === 'ChatConversation' && quoted) return `#${quoted.replace(/^#/, '')}`;
	return quoted;
}

/** A field of an entry that a request without the inbox extension sets. */
export type InboxRequestField = 'isUnread' | 'isArchived';

/**
 * The requests sent on a field of each entry, for a pane that shows their change before the platform answers. They
 * answer in any order and each may be refused, so no single answer says what the field holds: once every request sent
 * on a field of an entry has answered, it holds what the last accepted one set, or what it held before the first one
 * when none was accepted (archive then unarchive, both refused: not archived).
 */
export class InboxFieldRequests {
	private readonly chains = new Map<string, { before: boolean; requests: Array<{ id: number; value: boolean; accepted: boolean | null }> }>();
	private sent = 0;

	/**
	 * Records a request that sets `field` to `value` on the entries.
	 *
	 * @param entries The entries, as they were when it was sent.
	 * @returns The request's number, for {@link settle}.
	 */
	start(entries: readonly InboxEntry[], field: InboxRequestField, value: boolean): number {
		const id = ++this.sent;
		for (const entry of entries) {
			const key = `${entry.id}|${field}`;
			const chain = this.chains.get(key) ?? { before: entry[field], requests: [] };
			chain.requests.push({ id, value, accepted: null });
			this.chains.set(key, chain);
		}
		return id;
	}

	/**
	 * Records the platform's answer to a request for one entry.
	 *
	 * @returns What the field holds once every request sent on it has answered, or `undefined` while one is on its way.
	 */
	settle(entryId: string, field: InboxRequestField, request: number, accepted: boolean): boolean | undefined {
		const key = `${entryId}|${field}`;
		const chain = this.chains.get(key);
		if (!chain) return undefined;
		const sent = chain.requests.find((candidate) => candidate.id === request);
		if (sent) sent.accepted = accepted;
		if (chain.requests.some((candidate) => candidate.accepted === null)) return undefined;
		this.chains.delete(key);
		const lastAccepted = [...chain.requests].reverse().find((candidate) => candidate.accepted);
		return lastAccepted ? lastAccepted.value : chain.before;
	}
}

/** An entry from a platform inbox item. */
export function toInboxEntry(item: IInboxItem): InboxEntry {
	const metadata = item.metadata ?? {};
	const isNotification = item.kind === EInboxItemKind.Notification || item.externalSource === INBOX_NOTIFICATION_EXTERNAL_SOURCE;
	const type = isNotification ? knownTypeOf(metadata['notificationType']) : null;
	const rawTitle = stringOf(item.title) ?? '';
	const recipient = item.recipient;
	const entity = stringOf(item.entity);
	const entityId = stringOf(item.entityId);
	const timerReminder = isNotification ? timerReminderNoticeOf({ type, title: rawTitle, entity, entityId }) : null;
	const itemTaskId = stringOf(item.taskId) ?? (entity === EBaseEntityEnum.Task ? entityId : null);
	// A timer reminder is about its run: it opens the timer, not a task its item may name
	const taskId = timerReminder ? null : itemTaskId;
	// A chat notification carries its channel and its text in the title; a quote inside the text is not a subject.
	const chatParts = isNotification && entity === 'ChatMessage' ? messagePartsOfTitle(rawTitle) : null;
	const quoted = isNotification && !chatParts ? quotedSubjectOf(rawTitle) : null;
	const subject = subjectOf(entity, chatParts, quoted);
	const message = stringOf(item.body) ?? chatParts?.preview ?? null;
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
		chatMessageId: entity === 'ChatMessage' ? entityId : null,
		href: null,
		timerReminder,
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
	entry.href = hrefOf(type, entry, metadata);
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
		chatMessageId: null,
		href: notification.href,
		timerReminder: notification.timerReminder,
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
