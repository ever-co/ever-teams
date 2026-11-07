/**
 * The events the platform's real-time channel streams, as the web app reads them.
 *
 * Every streamed event is a content-free hint: it names a record and what happened to it, never the record
 * itself. The app refetches what it may read through the HTTP APIs. Nothing here is ever treated as data.
 */

/** The names the channel streams. One-segment patterns (`task.*`) select a whole family. */
export const REALTIME_EVENT_NAMES = {
	TASK_CREATED: 'task.created',
	TASK_UPDATED: 'task.updated',
	TASK_DELETED: 'task.deleted',
	COMMENT_CREATED: 'comment.created',
	COMMENT_UPDATED: 'comment.updated',
	COMMENT_DELETED: 'comment.deleted',
	MENTION_CREATED: 'mention.created',
	EMPLOYEE_NOTIFICATION_CREATED: 'employee_notification.created',
	DOCUMENT_UPDATED: 'document.updated',
	PRESENCE_CHANGED: 'presence.changed',
	TYPING_SIGNALLED: 'typing.signalled',
	CHAT_MESSAGE_CREATED: 'chat_message.created',
	CHAT_MESSAGE_UPDATED: 'chat_message.updated',
	CHAT_MESSAGE_DELETED: 'chat_message.deleted',
	CHAT_CONVERSATION_CHANGED: 'chat_conversation.changed',
	CHAT_MEMBER_STATE_CHANGED: 'chat_member_state.changed',
	CHAT_THREAD_CHANGED: 'chat_thread.changed',
	INBOX_ITEM_CREATED: 'inbox_item.created',
	INBOX_ITEM_STATE_CHANGED: 'inbox_item.state_changed'
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[keyof typeof REALTIME_EVENT_NAMES];

/** What the shared connection selects: every family the app's features consume. */
export const REALTIME_DEFAULT_SELECTION: readonly string[] = [
	'task.*',
	'comment.*',
	'mention.*',
	'employee_notification.*',
	'document.*',
	'presence.*',
	'typing.*',
	'chat_message.*',
	'chat_conversation.*',
	'chat_member_state.*',
	'chat_thread.*',
	'inbox_item.*'
];

/** What happened to the record a change hint names. */
export type RealtimeChangeAction = 'created' | 'updated' | 'deleted';

/** The payload of a streamed change hint. */
export interface RealtimeChangeHint {
	/** The record kind (`Task`, `Comment`, `Document`, …). */
	entity: string;
	entityId: string;
	action: RealtimeChangeAction;
	organizationId?: string | null;
	/** The user whose request caused the change, when known. */
	actorUserId?: string | null;
	/** The record this one belongs to (a comment's task), for a list kept by parent. */
	parent?: { entity: string; entityId: string } | null;
	/** The project a task belongs to, so a board can refetch one column. */
	projectId?: string | null;
	[key: string]: unknown;
}

/** One event as the subscription and the catch-up answer it. */
export interface RealtimeEnvelope {
	eventId: string;
	eventName: string;
	/** ISO date-time of the event. */
	occurredAt: string;
	aggregate: { type: string; id: string };
	sequence: number | null;
	data: RealtimeChangeHint | Record<string, unknown> | null;
}

/** The answer of the catch-up listing. */
export interface RealtimeCatchUp {
	events: RealtimeEnvelope[];
	/** The position to continue from: epoch ms to pass as `after` next time; `null` when the channel is off. */
	cursor: number | null;
	/** The `eventId` to pass as `afterId` beside `cursor`; `null` when there is no position yet. */
	cursorId: string | null;
	/** More events follow the ones answered: ask again before trusting the stream. */
	hasMore: boolean;
	/** The cursor predates what the platform retains: refetch through the read APIs. */
	resync: boolean;
}

/** What the catch-up listing is asked. */
export interface RealtimeCatchUpQuery {
	after?: number;
	afterId?: string | null;
	limit?: number;
}

/** A presence status the tab reports. */
export type RealtimePresenceStatus = 'active' | 'idle' | 'away' | 'offline';

/** Whether a name matches a selection entry: exact, or a one-segment pattern (`task.*`). */
export function matchesEventName(pattern: string, name: string): boolean {
	if (pattern === name) return true;
	if (pattern.endsWith('.*')) {
		const family = pattern.slice(0, -2);
		return name.startsWith(family + '.') && !name.slice(family.length + 1).includes('.');
	}
	return false;
}

/** Whether a name matches any entry of a selection. */
export function matchesAnyEventName(patterns: readonly string[], name: string): boolean {
	return patterns.some((pattern) => matchesEventName(pattern, name));
}

/** The change hint of an envelope, when it carries one. */
export function hintOf(envelope: RealtimeEnvelope): RealtimeChangeHint | null {
	const data = envelope.data;
	if (!data || typeof data !== 'object') return null;
	const entity = (data as RealtimeChangeHint).entity;
	const entityId = (data as RealtimeChangeHint).entityId;
	return typeof entity === 'string' && typeof entityId === 'string' ? (data as RealtimeChangeHint) : null;
}

/** The epoch milliseconds an envelope happened at, or `null` when its time cannot be read. */
export function occurredAtMs(envelope: Pick<RealtimeEnvelope, 'occurredAt'>): number | null {
	const ms = Date.parse(envelope.occurredAt);
	return Number.isFinite(ms) ? ms : null;
}
