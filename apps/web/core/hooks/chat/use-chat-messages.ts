'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { IChatMessage, IChatMessagePage, IChatMessagesQuery, IChatThreadPage } from '@/core/types/interfaces/common/chat';
import { mergeMessages, nextMessageOrder, withMessageOrder } from '@/core/lib/utils/chat-format';
import { REALTIME_EVENT_NAMES, type RealtimeEnvelope } from '@/core/lib/realtime/events';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { useChatScope } from './use-chat-scope';

/** Without the live channel the open conversation asks for newer messages on this cadence. */
const NEWER_POLL_MS = 5_000;
/**
 * Without the live channel the messages the open conversation holds are read again on this cadence: nothing else tells
 * it of an edit, a reaction or a deletion of a message it already shows (the poll reads newer messages only).
 */
const HELD_REFRESH_MS = 30_000;
/** The pages one catch-up reads at most (a long absence, a jump far back); the next one continues. */
const CATCH_UP_PAGES = 10;
/** The pages of replies a thread reads (500 replies at the platform's page size). */
const THREAD_MAX_PAGES = 10;

/** The messages of a conversation held in the query cache: oldest first. */
export interface ChatMessagesCache {
	messages: IChatMessage[];
	hasBefore: boolean;
	/** Newer messages exist than the newest held (after a jump to an older message): the catch-up reads them. */
	hasAfter: boolean;
	/**
	 * The newest message read from the platform: where the next "newer" request starts. Never a message this tab
	 * inserted itself (a send), which can be newer than messages not read yet.
	 */
	serverNewestId: string | null;
}

/** A message this tab shows before (or instead of) the platform's answer: a pending or a failed send. */
export function isLocalMessage(message: IChatMessage): boolean {
	return message.id.startsWith('pending:');
}

function newestIdOf(messages: readonly IChatMessage[]): string | null {
	return messages.length ? messages[messages.length - 1].id : null;
}

/**
 * Reads a page of a conversation for the timeline, its copies stamped with the order the read started at: a copy from
 * a read started earlier never replaces one from a read started later (see `mergeMessages`).
 */
async function readMessages(conversationId: string, query: IChatMessagesQuery = {}, signal?: AbortSignal): Promise<IChatMessagePage> {
	const order = nextMessageOrder();
	const page = await chatService.messages(conversationId, query, signal);
	return { ...page, messages: withMessageOrder(page.messages, order) };
}

/** The live events that change a message a timeline may already hold: an edit (a reaction, a pin) and a deletion. */
const MESSAGE_CHANGE_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.CHAT_MESSAGE_UPDATED, REALTIME_EVENT_NAMES.CHAT_MESSAGE_DELETED];

/** A string member of a live event's data, when it is one. */
function eventIdOf(data: RealtimeEnvelope['data'], key: string): string | null {
	const value = (data as Record<string, unknown> | null | undefined)?.[key];
	return typeof value === 'string' && value ? value : null;
}

/** The latest read of each held message, by timeline and message: the answer of an earlier read is dropped. */
const latestMessageReads = new Map<string, number>();
let messageReads = 0;

/**
 * Reads again one message a timeline holds and puts the platform's copy in its place. The refetch a live event triggers
 * reads only the newest page, which an older message is not on: without this, an edit or a deletion of a message
 * further up the timeline would stay unseen. Two quick changes (an edit, then a deletion) start two reads: only the one
 * started last may write, so an earlier answer that arrives late never puts an older copy back. Answers whether the
 * message was replaced.
 */
export async function refreshHeldMessage(queryClient: QueryClient, queryKey: QueryKey, conversationId: string, messageId: string): Promise<boolean> {
	const held = queryClient.getQueryData<ChatMessagesCache>(queryKey);
	if (!held?.messages.some((message) => message.id === messageId)) return false;
	const readKey = `${JSON.stringify(queryKey)}|${messageId}`;
	messageReads += 1;
	const read = messageReads;
	latestMessageReads.set(readKey, read);
	try {
		const page = await readMessages(conversationId, { around: messageId });
		if (latestMessageReads.get(readKey) !== read) return false;
		const fresh = page.messages.find((message) => message.id === messageId);
		if (!fresh) return false;
		let replaced = false;
		queryClient.setQueryData<ChatMessagesCache>(queryKey, (current) => {
			// Only a message still held is replaced: a timeline that moved on (a jump, a reload) is left as it is.
			if (!current?.messages.some((message) => message.id === messageId)) return current;
			replaced = true;
			return { ...current, messages: mergeMessages(current.messages, [fresh]) };
		});
		return replaced;
	} finally {
		if (latestMessageReads.get(readKey) === read) latestMessageReads.delete(readKey);
	}
}

/**
 * Reads again the messages a timeline holds, a page at a time up to the catch-up budget, and puts the platform's copies
 * in their place: an edit, a reaction, a deletion's tombstone. It starts at the oldest held message, or after `from`
 * (where the previous refresh stopped), and answers where to go on (`next`: the last message read when the budget ran
 * out) or `null` once it reached the newest held one, so a long timeline is covered
 * over several refreshes and then from the oldest again. Only held messages are written: newer ones are the forward
 * read's, which keeps `serverNewestId`; a held message deleted on the platform (left out of the pages) is removed. A
 * copy read before a jump never replaces the jump's (`mergeMessages` keeps the
 * copy of the read started last).
 */
export async function refreshHeldWindow(
	queryClient: QueryClient,
	queryKey: QueryKey,
	conversationId: string,
	from: string | null = null
): Promise<{ replaced: number; removed: number; next: string | null }> {
	const held = queryClient.getQueryData<ChatMessagesCache>(queryKey)?.messages.filter((message) => !isLocalMessage(message)) ?? [];
	if (!held.length) return { replaced: 0, removed: 0, next: null };
	const heldIds = new Set(held.map((message) => message.id));
	// Read up to the newest held message itself (or past its time, should it be gone), not up to the first page that
	// ends on a message not held: a page may end inside a gap of the held timeline, or on a message stamped the same
	// time as the newest held one, and the held messages after it still need reading.
	const newestHeld = held[held.length - 1];
	const newestHeldAt = Date.parse(newestHeld.createdAt);
	let reachedNewest = false;
	const fresh: IChatMessage[] = [];
	const answered = new Set<string>();
	let next: string | null = null;
	// The stretch of the timeline the pages covered: from the first message read (or the conversation's start) to the
	// last one read (or its end).
	let firstAt: number | null = null;
	let lastAt: number | null = null;
	let toEnd = false;
	// Goes on after the previous refresh's last message (held or not: a long gap is not read twice); one past the held
	// window (a jump replaced the timeline) ends at its first page, and the next refresh starts from the oldest.
	let page = from ? await readMessages(conversationId, { after: from }) : await readMessages(conversationId, { around: held[0].id });
	const fromStart = !from && !page.hasBefore;
	for (let read = 1; ; read += 1) {
		for (const message of page.messages) {
			answered.add(message.id);
			if (!heldIds.has(message.id)) continue;
			fresh.push(message);
			if (message.id === newestHeld.id) reachedNewest = true;
		}
		const last = page.messages[page.messages.length - 1];
		if (last) {
			firstAt ??= Date.parse(page.messages[0].createdAt);
			lastAt = Date.parse(last.createdAt);
		}
		toEnd = !page.hasAfter;
		// Past the newest message held, or at the end of the conversation: the next refresh starts from the oldest.
		if (!last || !page.hasAfter || reachedNewest || Date.parse(last.createdAt) > newestHeldAt) break;
		// Out of budget: the next refresh goes on after the last message read.
		if (read >= CATCH_UP_PAGES) {
			next = last.id;
			break;
		}
		page = await readMessages(conversationId, { after: last.id });
	}
	// A message deleted without replies is left out of the pages (only a thread's root stays, as a tombstone): a held
	// message inside the stretch read that no page answered is gone. Strictly inside: one stamped like an edge may sit
	// on the page next to it. Messages held only since the read began (a send, a jump) are not judged.
	const inside = (at: number) => (fromStart || (firstAt !== null && at > firstAt)) && (toEnd || (lastAt !== null && at < lastAt));
	const gone = new Set(held.filter((message) => !answered.has(message.id) && inside(Date.parse(message.createdAt))).map((message) => message.id));
	let replaced = 0;
	let removed = 0;
	queryClient.setQueryData<ChatMessagesCache>(queryKey, (current) => {
		if (!current) return current;
		// Only a message still held is put back: a timeline that moved on meanwhile (a jump, a reload) keeps what it has.
		const still = new Set(current.messages.map((message) => message.id));
		const kept = fresh.filter((message) => still.has(message.id));
		const remaining = current.messages.filter((message) => !gone.has(message.id));
		replaced = kept.length;
		removed = current.messages.length - remaining.length;
		return kept.length || removed ? { ...current, messages: mergeMessages(remaining, kept) } : current;
	});
	return { replaced, removed, next };
}

/** Reads forward from a message: every newer one, a page at a time, up to the catch-up budget. */
async function readAfter(conversationId: string, fromId: string, signal?: AbortSignal): Promise<{ messages: IChatMessage[]; newestId: string; hasAfter: boolean }> {
	const messages: IChatMessage[] = [];
	let newestId = fromId;
	let hasAfter = true;
	for (let page = 0; page < CATCH_UP_PAGES && hasAfter; page += 1) {
		const answer: IChatMessagePage = await readMessages(conversationId, { after: newestId }, signal);
		messages.push(...answer.messages);
		if (!answer.messages.length) {
			hasAfter = false;
			break;
		}
		newestId = answer.messages[answer.messages.length - 1].id;
		hasAfter = answer.hasAfter;
	}
	return { messages, newestId, hasAfter };
}

/**
 * The timeline of a conversation: the newest page first, older pages on demand (`loadOlder`), newer messages by
 * polling while the live channel is absent, and a jump to any message (`jumpTo`). Everything lands in one cache
 * entry per conversation (the actions and the live channel write into it too), ordered by time, without duplicates,
 * and newer messages are always read from the last one read from the platform, so none is skipped.
 */
export function useChatMessages(conversationId: string | null, enabled: boolean) {
	const scope = useChatScope();
	const queryClient = useQueryClient();
	const tenantId = scope?.tenantId ?? null;
	const queryKey = useMemo(() => queryKeys.chat.messages(tenantId, conversationId), [conversationId, tenantId]);
	const [isLoadingOlder, setLoadingOlder] = useState(false);

	const query = useQuery<ChatMessagesCache>({
		queryKey,
		queryFn: async ({ signal }) => {
			const page: IChatMessagePage = await readMessages(conversationId as string, {}, signal);
			const current = queryClient.getQueryData<ChatMessagesCache>(queryKey);
			if (!current) {
				return { messages: mergeMessages([], page.messages), hasBefore: page.hasBefore, hasAfter: false, serverNewestId: newestIdOf(page.messages) };
			}
			// A refetch (a live hint, a retry). After a jump the catch-up moves forward on its own; the newest page
			// would leave a gap.
			if (current.hasAfter) return current;
			let messages = mergeMessages(current.messages, page.messages);
			// The newest page does not reach back to what was read last: read the gap forward first.
			if (current.serverNewestId && page.hasBefore && !page.messages.some((message) => message.id === current.serverNewestId)) {
				const gap = await readAfter(conversationId as string, current.serverNewestId, signal);
				messages = mergeMessages(messages, gap.messages);
			}
			return {
				messages,
				hasBefore: current.messages.some((message) => !isLocalMessage(message)) ? current.hasBefore : page.hasBefore,
				hasAfter: false,
				serverNewestId: newestIdOf(page.messages) ?? current.serverNewestId
			};
		},
		enabled: enabled && scope !== null && !!conversationId,
		staleTime: Infinity,
		refetchOnWindowFocus: false
	});

	const messages = query.data?.messages ?? [];
	const newest = messages[messages.length - 1];
	const newestId = newest?.id ?? null;
	const hasData = !!query.data;

	// The key is read through a ref, so the poll keeps its own cadence however often the page renders (typing).
	const keyRef = useRef(queryKey);
	keyRef.current = queryKey;
	// Over the live channel every new message is an event that refetches this timeline: the poll pauses, and resumes
	// the moment the connection drops (the reconnect replays what was missed).
	const liveRef = useRef(false);
	liveRef.current = useAtomValue(realtimeStatusAtom) === 'connected';

	// Newer messages, while this tab is visible: read forward from the newest one read from the platform. Without the live
	// channel the held messages are also read again now and then (edits and deletions).
	useEffect(() => {
		if (!enabled || !conversationId || !hasData || typeof window === 'undefined') return;
		let busy = false;
		// The timeline was just read: the first refresh of what it holds comes a cadence later. It runs on its own (a
		// slow one never holds up newer messages), one at a time, and goes on where the previous one stopped.
		let heldReadAt = Date.now();
		let heldBusy = false;
		let heldFrom: string | null = null;
		const refreshHeld = async () => {
			if (heldBusy) return;
			heldBusy = true;
			heldReadAt = Date.now();
			try {
				heldFrom = (await refreshHeldWindow(queryClient, keyRef.current, conversationId, heldFrom)).next;
			} catch {
				// The next refresh reads again (from the oldest).
				heldFrom = null;
			} finally {
				heldBusy = false;
			}
		};
		const tick = async () => {
			if (document.visibilityState !== 'visible') return;
			// Live, the change events read a changed message again (see below); without them the poll does, on its own
			// cadence, whether or not the newer messages read (a forward read that keeps failing).
			if (!liveRef.current && !heldBusy && Date.now() - heldReadAt >= HELD_REFRESH_MS) void refreshHeld();
			if (busy) return;
			const key = keyRef.current;
			// Live: the poll pauses — but a timeline opened at an older message keeps reading forward until it reaches the
			// newest (an event's refetch leaves such a timeline as it is).
			if (liveRef.current && !queryClient.getQueryData<ChatMessagesCache>(key)?.hasAfter) return;
			busy = true;
			try {
				const latest = queryClient.getQueryData<ChatMessagesCache>(key);
				if (!latest) return;
				if (!latest.serverNewestId) {
					// Nothing read yet (an empty conversation): the newest page, so a first message appears.
					const page = await readMessages(conversationId, {});
					if (!page.messages.length) return;
					queryClient.setQueryData<ChatMessagesCache>(key, (current) =>
						current ? { ...current, messages: mergeMessages(current.messages, page.messages), hasBefore: page.hasBefore, serverNewestId: newestIdOf(page.messages) } : current
					);
					return;
				}
				const read = await readAfter(conversationId, latest.serverNewestId);
				queryClient.setQueryData<ChatMessagesCache>(key, (current) =>
					current ? { ...current, messages: mergeMessages(current.messages, read.messages), hasAfter: read.hasAfter, serverNewestId: read.newestId } : current
				);
			} catch {
				// The message read last may be gone (deleted): start again from the newest page.
				try {
					const page = await readMessages(conversationId, {});
					queryClient.setQueryData<ChatMessagesCache>(key, (current) =>
						current ? { ...current, messages: mergeMessages(current.messages, page.messages), hasAfter: false, serverNewestId: newestIdOf(page.messages) ?? current.serverNewestId } : current
					);
				} catch {
					// The next tick asks again.
				}
			} finally {
				busy = false;
			}
		};
		const timer = window.setInterval(() => void tick(), NEWER_POLL_MS);
		return () => window.clearInterval(timer);
	}, [conversationId, enabled, hasData, queryClient, tenantId]);

	// An edit or a deletion of a message this timeline holds: the refetch the event triggers reads only the newest page,
	// so the message itself is read again (an older one is not on that page).
	useRealtimeEvent(MESSAGE_CHANGE_EVENTS, (envelope) => {
		const messageId = eventIdOf(envelope.data, 'messageId');
		if (!enabled || !conversationId || !messageId || eventIdOf(envelope.data, 'conversationId') !== conversationId) return;
		refreshHeldMessage(queryClient, queryKey, conversationId, messageId).catch(() => {
			// The message may be gone or unreadable now: the next refetch or a reload shows what it is.
		});
	});

	const loadOlder = useCallback(async () => {
		const current = queryClient.getQueryData<ChatMessagesCache>(queryKey);
		const oldest = current?.messages.find((message) => !isLocalMessage(message));
		if (!conversationId || !current?.hasBefore || !oldest || isLoadingOlder) return;
		setLoadingOlder(true);
		try {
			const page = await readMessages(conversationId, { before: oldest.id });
			queryClient.setQueryData<ChatMessagesCache>(queryKey, (cached) =>
				cached ? { ...cached, messages: mergeMessages(cached.messages, page.messages), hasBefore: page.hasBefore } : cached
			);
		} finally {
			setLoadingOlder(false);
		}
	}, [conversationId, isLoadingOlder, queryClient, queryKey]);

	/**
	 * Brings a message into the timeline (a link to it): the page around it replaces what is held when it is not
	 * there yet; the catch-up then reads forward to the newest. Answers whether the message exists.
	 */
	const jumpTo = useCallback(
		async (messageId: string): Promise<boolean> => {
			const current = queryClient.getQueryData<ChatMessagesCache>(queryKey);
			if (!conversationId) return false;
			if (current?.messages.some((message) => message.id === messageId)) return true;
			const page = await readMessages(conversationId, { around: messageId });
			const unsent = current?.messages.filter(isLocalMessage) ?? [];
			queryClient.setQueryData<ChatMessagesCache>(queryKey, {
				messages: mergeMessages(unsent, page.messages),
				hasBefore: page.hasBefore,
				hasAfter: page.hasAfter,
				serverNewestId: newestIdOf(page.messages) ?? current?.serverNewestId ?? null
			});
			return page.messages.some((message) => message.id === messageId);
		},
		[conversationId, queryClient, queryKey]
	);

	return {
		messages,
		newestId,
		hasBefore: query.data?.hasBefore ?? false,
		hasAfter: query.data?.hasAfter ?? false,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		isLoadingOlder,
		loadOlder,
		jumpTo,
		retry: query.refetch,
		queryKey
	};
}

/**
 * A thread: its root and its replies, oldest first — every page of them up to the budget, so a long discussion is
 * whole. Polled (and refetched on live hints); the replies this tab has not got through yet (pending, failed) stay
 * until the platform has them.
 */
export function useChatThread(rootMessageId: string | null, enabled: boolean) {
	const scope = useChatScope();
	const queryClient = useQueryClient();
	const tenantId = scope?.tenantId ?? null;
	const queryKey = useMemo(() => queryKeys.chat.thread(tenantId, rootMessageId), [rootMessageId, tenantId]);
	const live = useAtomValue(realtimeStatusAtom) === 'connected';
	const query = useQuery<IChatThreadPage>({
		queryKey,
		queryFn: async ({ signal }) => {
			let page = await chatService.thread(rootMessageId as string, {}, signal);
			const root = page.root;
			const replies = [...page.messages];
			for (let pages = 1; page.hasAfter && page.messages.length && pages < THREAD_MAX_PAGES; pages += 1) {
				page = await chatService.thread(rootMessageId as string, { after: page.messages[page.messages.length - 1].id }, signal);
				replies.push(...page.messages);
			}
			const current = queryClient.getQueryData<IChatThreadPage>(queryKey);
			const delivered = new Set(replies.map((reply) => reply.nonce).filter(Boolean));
			const unsent = (current?.messages ?? []).filter((message) => isLocalMessage(message) && !(message.nonce && delivered.has(message.nonce)));
			return { root, messages: mergeMessages(unsent, replies), hasBefore: false, hasAfter: page.hasAfter };
		},
		enabled: enabled && scope !== null && !!rootMessageId,
		staleTime: NEWER_POLL_MS / 2,
		refetchInterval: live ? false : NEWER_POLL_MS,
		refetchIntervalInBackground: false
	});
	const replies = useMemo(() => query.data?.messages ?? [], [query.data?.messages]);
	return { root: query.data?.root ?? null, replies, hasAfter: query.data?.hasAfter ?? false, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch, queryKey };
}
