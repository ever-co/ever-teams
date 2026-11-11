'use client';

import { useSyncExternalStore } from 'react';
import { useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import { isChatLinkPreviewsEnabled } from '@/core/lib/utils/chat-enabled';
import {
	createChatLinkPreviewSession,
	linkPreviewCardOf,
	type ChatLinkPreviewCard,
	type ChatLinkPreviewSession,
	type ChatPreviewLink
} from '@/core/lib/utils/chat-link-preview';
import { EChatLinkPreviewStatus, type IChatLinkPreview } from '@/core/types/interfaces/common/chat';
import { useChatScope } from './use-chat-scope';

/** How long a preview nobody shows stays in memory: a link posted again (or scrolled back to) is not asked for again. */
const PREVIEW_GC_MS = 30 * 60_000;

/** One session per query client, so per page (and a fresh one per test). */
const sessions = new WeakMap<QueryClient, ChatLinkPreviewSession>();

function sessionOf(client: QueryClient): ChatLinkPreviewSession {
	let session = sessions.get(client);
	if (!session) {
		session = createChatLinkPreviewSession((url, signal) => chatService.linkPreview(url, signal));
		sessions.set(client, session);
	}
	return session;
}

const ROUTE_PRESENT_ON_SERVER = () => false;

/**
 * A preview is kept for the page's life, except one still `pending` after its few asks: shown again (the
 * conversation opened again, the message scrolled back to), it is asked for again.
 */
function staleTimeOf(preview: IChatLinkPreview | null | undefined): number {
	return preview?.status === EChatLinkPreviewStatus.Pending ? 0 : Infinity;
}

/**
 * The preview cards of a message's links, from what the platform answers (`/chat/link-preview`): one query per link,
 * shared by every message that carries it. Behind `NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED`; a platform without the
 * route (404) turns them off for the page after a single ask, and a link without a preview is not asked for again.
 * Nothing is ever shown as an error: a link without a card is a plain link.
 */
export function useChatLinkPreviews(links: readonly ChatPreviewLink[]): ChatLinkPreviewCard[] {
	const session = sessionOf(useQueryClient());
	const routeMissing = useSyncExternalStore(session.subscribe, session.routeMissing, ROUTE_PRESENT_ON_SERVER);
	const scope = useChatScope();
	const on = isChatLinkPreviewsEnabled() && scope !== null && !routeMissing;
	const answers = useQueries({
		queries: links.map((link) => ({
			queryKey: queryKeys.chatLinkPreview(scope?.tenantId, link.url),
			queryFn: ({ signal }: { signal: AbortSignal }) => session.load(link.url, signal),
			enabled: on && !session.isUnavailable(link.url),
			staleTime: (query: { state: { data?: IChatLinkPreview | null } }) => staleTimeOf(query.state.data),
			gcTime: PREVIEW_GC_MS,
			retry: false,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false
		}))
	});
	if (!on) return [];
	const cards: ChatLinkPreviewCard[] = [];
	links.forEach((link, index) => {
		const card = linkPreviewCardOf(link, answers[index]?.data);
		if (card) cards.push(card);
	});
	return cards;
}
