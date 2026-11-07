import type { QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { hintOf, REALTIME_EVENT_NAMES, RealtimeEnvelope } from './events';

/** The scope the app acts in, for the keys that carry one. */
export interface RealtimeScope {
	tenantId: string | null;
	organizationId: string | null;
	employeeId: string | null;
	userId: string | null;
}

/** One refetch to make: the key prefix, and whether it may wait while the user types in that area. */
export interface RealtimeInvalidation {
	queryKey: QueryKey;
	/** The queries of an area with text editors (task detail, comments): held while such a field is focused. */
	deferrable: boolean;
}

/**
 * The notification badge and list, by prefix: the bell keys them by the workspace's own scope (cookies, the
 * employee id), which the signed-in user's relations may not carry — a prefix reaches them whatever it is (only
 * the signed-in user's queries are in the cache).
 */
const NOTIFICATION_KEYS: RealtimeInvalidation[] = [
	{ queryKey: ['notifications', 'unread-count'], deferrable: false },
	{ queryKey: ['notifications', 'inbox'], deferrable: false }
];

/** A document's queries: the pages, and the task and project file lists that show linked documents. */
const DOCUMENT_KEYS: RealtimeInvalidation[] = [
	{ queryKey: ['documents'], deferrable: true },
	{ queryKey: queryKeys.entityFiles.all, deferrable: true }
];

/** The keys a resynchronisation refetches: everything the channel carries. */
export function resyncInvalidations(scope: RealtimeScope): RealtimeInvalidation[] {
	return [
		{ queryKey: queryKeys.tasks.all, deferrable: true },
		{ queryKey: queryKeys.taskComments.all, deferrable: true },
		...NOTIFICATION_KEYS,
		{ queryKey: queryKeys.organizationTeams.all, deferrable: false },
		...DOCUMENT_KEYS,
		{ queryKey: ['chat'], deferrable: false },
		{ queryKey: ['inbox'], deferrable: false }
	];
}

/**
 * The queries a change hint makes stale. Content-free on purpose: the hint says what changed, the refetch
 * says what it now is.
 *
 * @param envelope The event.
 * @param scope The app's scope.
 * @returns The refetches to make, none for an event the app has no query for (a typing signal).
 */
export function invalidationsFor(envelope: RealtimeEnvelope, scope: RealtimeScope): RealtimeInvalidation[] {
	const name = envelope.eventName;
	const hint = hintOf(envelope);
	const family = name.split('.')[0];

	switch (family) {
		case 'task':
			return [
				...(hint ? [{ queryKey: queryKeys.tasks.detail(hint.entityId), deferrable: true }] : []),
				{ queryKey: queryKeys.tasks.all, deferrable: true }
			];
		case 'comment': {
			const parent = hint?.parent;
			if (parent?.entity === 'Task') {
				return [{ queryKey: queryKeys.taskComments.byTask(scope.tenantId, scope.organizationId, parent.entityId), deferrable: true }];
			}
			return [{ queryKey: queryKeys.taskComments.all, deferrable: true }];
		}
		case 'mention':
		case 'employee_notification':
		case 'inbox_item':
			return [...NOTIFICATION_KEYS, { queryKey: ['inbox'], deferrable: false }];
		case 'document':
			return [...DOCUMENT_KEYS];
		case 'presence':
			return [{ queryKey: queryKeys.organizationTeams.all, deferrable: false }];
		case 'chat_message':
		case 'chat_conversation':
		case 'chat_member_state':
		case 'chat_thread':
			return [{ queryKey: ['chat'], deferrable: false }];
		default:
			return name === REALTIME_EVENT_NAMES.TYPING_SIGNALLED ? [] : [];
	}
}

/** A stable string of a key, to fold the same refetch asked twice within one window. */
export function keyOf(queryKey: QueryKey): string {
	return JSON.stringify(queryKey);
}
