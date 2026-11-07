'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { IChatMessage, IChatMessagePage, IChatThreadPage } from '@/core/types/interfaces/common/chat';
import { mergeMessages } from '@/core/lib/utils/chat-format';
import { useChatScope } from './use-chat-scope';

/** Without the live channel the open conversation asks for newer messages on this cadence. */
const NEWER_POLL_MS = 5_000;

/** The messages of a conversation held in the query cache: oldest first, with whether older ones exist. */
export interface ChatMessagesCache {
	messages: IChatMessage[];
	hasBefore: boolean;
}

/**
 * The timeline of a conversation: the newest page first, older pages on demand (`loadOlder`), newer messages
 * by polling while the live channel is absent. Everything lands in one cache entry per conversation (the
 * actions and the live channel write into it too), ordered by time, without duplicates.
 */
export function useChatMessages(conversationId: string | null, enabled: boolean) {
	const scope = useChatScope();
	const queryClient = useQueryClient();
	const queryKey = queryKeys.chat.messages(scope?.tenantId, conversationId);
	const [isLoadingOlder, setLoadingOlder] = useState(false);

	const query = useQuery<ChatMessagesCache>({
		queryKey,
		queryFn: async ({ signal }) => {
			const page: IChatMessagePage = await chatService.messages(conversationId as string, {}, signal);
			return { messages: mergeMessages([], page.messages), hasBefore: page.hasBefore };
		},
		enabled: enabled && scope !== null && !!conversationId,
		staleTime: Infinity,
		refetchOnWindowFocus: false
	});

	const messages = query.data?.messages ?? [];
	const newest = messages[messages.length - 1];
	const newestId = newest?.id ?? null;

	// Newer messages, while this tab is visible: appended to the cache (a reconnecting live channel does the same).
	const polling = useRef<number | null>(null);
	useEffect(() => {
		if (!enabled || !conversationId || !query.data || typeof window === 'undefined') return;
		const tick = async () => {
			if (document.visibilityState !== 'visible') return;
			try {
				const latest = queryClient.getQueryData<ChatMessagesCache>(queryKey);
				const anchor = latest?.messages[latest.messages.length - 1]?.id;
				const page = anchor ? await chatService.messages(conversationId, { after: anchor }) : null;
				if (page?.messages.length) {
					queryClient.setQueryData<ChatMessagesCache>(queryKey, (current) =>
						current ? { ...current, messages: mergeMessages(current.messages, page.messages) } : current
					);
				}
			} catch {
				// The next tick asks again.
			}
		};
		polling.current = window.setInterval(() => void tick(), NEWER_POLL_MS);
		return () => {
			if (polling.current !== null) window.clearInterval(polling.current);
		};
	}, [conversationId, enabled, query.data, queryClient, queryKey]);

	const loadOlder = useCallback(async () => {
		const current = queryClient.getQueryData<ChatMessagesCache>(queryKey);
		const oldest = current?.messages[0];
		if (!conversationId || !current?.hasBefore || !oldest || isLoadingOlder) return;
		setLoadingOlder(true);
		try {
			const page = await chatService.messages(conversationId, { before: oldest.id });
			queryClient.setQueryData<ChatMessagesCache>(queryKey, (cached) =>
				cached ? { messages: mergeMessages(cached.messages, page.messages), hasBefore: page.hasBefore } : cached
			);
		} finally {
			setLoadingOlder(false);
		}
	}, [conversationId, isLoadingOlder, queryClient, queryKey]);

	return {
		messages,
		newestId,
		hasBefore: query.data?.hasBefore ?? false,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		isLoadingOlder,
		loadOlder,
		retry: query.refetch,
		queryKey
	};
}

/** The replies of a thread, oldest first, with its root. */
export function useChatThread(rootMessageId: string | null, enabled: boolean) {
	const scope = useChatScope();
	const queryKey = queryKeys.chat.thread(scope?.tenantId, rootMessageId);
	const query = useQuery<IChatThreadPage>({
		queryKey,
		queryFn: ({ signal }) => chatService.thread(rootMessageId as string, {}, signal),
		enabled: enabled && scope !== null && !!rootMessageId,
		staleTime: NEWER_POLL_MS / 2,
		refetchInterval: NEWER_POLL_MS,
		refetchIntervalInBackground: false
	});
	const replies = useMemo(() => query.data?.messages ?? [], [query.data?.messages]);
	return { root: query.data?.root ?? null, replies, hasAfter: query.data?.hasAfter ?? false, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch, queryKey };
}
