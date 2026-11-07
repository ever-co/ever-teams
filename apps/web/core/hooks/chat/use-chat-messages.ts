'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { IChatMessage, IChatMessagePage, IChatThreadPage } from '@/core/types/interfaces/common/chat';
import { mergeMessages } from '@/core/lib/utils/chat-format';
import { useChatScope } from './use-chat-scope';

/** Without the live channel the open conversation asks for newer messages on this cadence. */
const NEWER_POLL_MS = 5_000;
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

/** Reads forward from a message: every newer one, a page at a time, up to the catch-up budget. */
async function readAfter(conversationId: string, fromId: string, signal?: AbortSignal): Promise<{ messages: IChatMessage[]; newestId: string; hasAfter: boolean }> {
	const messages: IChatMessage[] = [];
	let newestId = fromId;
	let hasAfter = true;
	for (let page = 0; page < CATCH_UP_PAGES && hasAfter; page += 1) {
		const answer: IChatMessagePage = await chatService.messages(conversationId, { after: newestId }, signal);
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
			const page: IChatMessagePage = await chatService.messages(conversationId as string, {}, signal);
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

	// Newer messages, while this tab is visible: read forward from the newest one read from the platform.
	useEffect(() => {
		if (!enabled || !conversationId || !hasData || typeof window === 'undefined') return;
		let busy = false;
		const tick = async () => {
			if (busy || document.visibilityState !== 'visible') return;
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
					const page = await chatService.messages(conversationId, {});
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
					const page = await chatService.messages(conversationId, {});
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

	const loadOlder = useCallback(async () => {
		const current = queryClient.getQueryData<ChatMessagesCache>(queryKey);
		const oldest = current?.messages.find((message) => !isLocalMessage(message));
		if (!conversationId || !current?.hasBefore || !oldest || isLoadingOlder) return;
		setLoadingOlder(true);
		try {
			const page = await chatService.messages(conversationId, { before: oldest.id });
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
			const page = await chatService.messages(conversationId, { around: messageId });
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
