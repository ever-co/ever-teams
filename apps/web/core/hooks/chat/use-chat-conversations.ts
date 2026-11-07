'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import { isUnread, sortConversations } from '@/core/lib/utils/chat-format';
import { useChatScope } from './use-chat-scope';

/** The list refreshes on this cadence while the tab is visible (the live channel refetches it sooner). */
const LIST_POLL_MS = 30_000;

/** My conversations with my state, and the categories; sorted for the sidebar. */
export function useChatConversations(enabled: boolean) {
	// Over the live channel the lists are refetched when an event says they changed: no poll.
	const live = useAtomValue(realtimeStatusAtom) === 'connected';
	const scope = useChatScope();
	const query = useQuery({
		queryKey: queryKeys.chat.conversations(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => chatService.listMine(signal),
		enabled: enabled && scope !== null,
		staleTime: LIST_POLL_MS / 2,
		refetchInterval: live ? false : LIST_POLL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true
	});

	const conversations = useMemo(() => sortConversations(query.data?.conversations ?? []), [query.data?.conversations]);
	const categories = query.data?.categories ?? [];
	const unreadCount = useMemo(() => conversations.filter(isUnread).length, [conversations]);
	const mentionCount = useMemo(() => conversations.reduce((sum, c) => sum + (c.state?.mentionCount ?? 0), 0), [conversations]);
	const byId = useMemo(() => new Map(conversations.map((c) => [c.id, c])), [conversations]);

	return {
		conversations,
		categories,
		byId,
		unreadCount,
		mentionCount,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		retry: query.refetch
	};
}

/** The public channels I am not in. */
export function useChatBrowse(enabled: boolean) {
	const scope = useChatScope();
	const query = useQuery({
		queryKey: queryKeys.chat.browse(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => chatService.browse(signal),
		enabled: enabled && scope !== null,
		staleTime: 30_000
	});
	return { channels: (query.data ?? []) as IChatConversationWithState[], isLoading: query.isPending && query.fetchStatus !== 'idle', retry: query.refetch };
}

/** One conversation with my state (when it is not in the list yet: a deep link). */
export function useChatConversation(conversationId: string | null, known: IChatConversationWithState | null, enabled: boolean) {
	const scope = useChatScope();
	const query = useQuery({
		queryKey: [...queryKeys.chat.all, 'conversation', scope?.tenantId ?? null, conversationId ?? null] as const,
		queryFn: ({ signal }) => chatService.getConversation(conversationId as string, signal),
		enabled: enabled && scope !== null && !!conversationId && !known,
		staleTime: 30_000,
		retry: false
	});
	return { conversation: known ?? query.data ?? null, isLoading: !known && query.isPending && query.fetchStatus !== 'idle', isError: !known && query.isError };
}

/** The members of a conversation (for the header and the mention suggestions of a private conversation). */
export function useChatMembers(conversationId: string | null, enabled: boolean) {
	const scope = useChatScope();
	const query = useQuery({
		queryKey: queryKeys.chat.members(scope?.tenantId, conversationId),
		queryFn: ({ signal }) => chatService.members(conversationId as string, signal),
		enabled: enabled && scope !== null && !!conversationId,
		staleTime: 60_000
	});
	return { members: query.data ?? [], isLoading: query.isPending && query.fetchStatus !== 'idle' };
}

/** My state of every conversation and my followed threads with their unread replies (the Threads badge). */
export function useChatStates(enabled: boolean) {
	// Over the live channel the lists are refetched when an event says they changed: no poll.
	const live = useAtomValue(realtimeStatusAtom) === 'connected';
	const scope = useChatScope();
	const query = useQuery({
		queryKey: queryKeys.chat.states(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => chatService.states(signal),
		enabled: enabled && scope !== null,
		staleTime: LIST_POLL_MS / 2,
		refetchInterval: live ? false : LIST_POLL_MS,
		refetchIntervalInBackground: false
	});
	const threadsUnread = useMemo(() => (query.data?.threads ?? []).reduce((sum, thread) => sum + (thread.unreadReplies ?? 0), 0), [query.data?.threads]);
	return { threadsUnread };
}

/** My followed threads with unread replies. */
export function useChatThreads(enabled: boolean) {
	// Over the live channel the lists are refetched when an event says they changed: no poll.
	const live = useAtomValue(realtimeStatusAtom) === 'connected';
	const scope = useChatScope();
	const query = useQuery({
		queryKey: queryKeys.chat.threads(scope?.tenantId, scope?.userId),
		queryFn: ({ signal }) => chatService.followedThreads(signal),
		enabled: enabled && scope !== null,
		staleTime: LIST_POLL_MS / 2,
		refetchInterval: live ? false : LIST_POLL_MS,
		refetchIntervalInBackground: false
	});
	return { threads: query.data ?? [], isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch };
}
