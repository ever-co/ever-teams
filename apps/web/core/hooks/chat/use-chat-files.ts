'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { queryKeys } from '@/core/query/keys';
import { CHAT_FILES_PAGE_SIZE, chatService } from '@/core/services/client/api/chat/chat.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { filesById, unknownAttachmentIds } from '@/core/lib/utils/chat-attachments';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import type { IChatFile, IChatMessage } from '@/core/types/interfaces/common/chat';
import { useChatScope } from './use-chat-scope';

/**
 * The files' addresses are signed on cloud storage, so they expire: the list is read again well before, on this cadence
 * while it is shown. A picture that fails to load asks for a fresh read sooner ({@link ChatFiles.refresh}).
 */
const FILES_STALE_MS = 10 * 60_000;

/** How many older pages are read to find the files of the messages on screen, at most, before they show as plain chips. */
const MAX_LOOKUP_PAGES = 5;

const NO_FILES: IChatFile[] = [];

export interface ChatFiles {
	/** Every file loaded, newest first. */
	files: IChatFile[];
	byId: ReadonlyMap<string, IChatFile>;
	hasMore: boolean;
	isLoading: boolean;
	isError: boolean;
	isLoadingMore: boolean;
	loadMore: () => void;
	refresh: () => void;
}

/**
 * The files of a conversation (`/chat/conversations/:id/files`), newest first, paged. They follow the messages: when a
 * message names a file the list does not hold (it just arrived, or it is older than the pages read), the list is read
 * again, then older pages, a few at most. A platform without the route answers 404: no file then shows its name, and
 * nothing is asked again.
 */
export function useChatFiles(conversationId: string | null, messages: readonly IChatMessage[] = []): ChatFiles {
	const scope = useChatScope();
	const query = useInfiniteQuery({
		queryKey: queryKeys.chat.files(scope?.tenantId, conversationId),
		queryFn: ({ pageParam, signal }) =>
			chatService.files(conversationId as string, { skip: pageParam, limit: CHAT_FILES_PAGE_SIZE }, signal),
		initialPageParam: 0,
		getNextPageParam: (last, pages) =>
			last.hasMore ? pages.reduce((sum, page) => sum + page.files.length, 0) : undefined,
		enabled: isChatEnabled() && scope !== null && !!conversationId,
		staleTime: FILES_STALE_MS,
		// Read again on that cadence while the conversation is open, so its links and pictures keep a live address.
		refetchInterval: FILES_STALE_MS,
		refetchIntervalInBackground: false,
		retry: (failureCount, error) => errorStatusOf(error) !== 404 && errorStatusOf(error) !== 403 && failureCount < 2
	});

	const pages = query.data?.pages;
	const files = useMemo(() => (pages ? pages.flatMap((page) => page.files) : NO_FILES), [pages]);
	const byId = useMemo(() => filesById(files), [files]);
	const missing = useMemo(() => unknownAttachmentIds(messages, byId), [byId, messages]);
	const missingKey = missing.join(',');
	// The files already looked for: a file the platform no longer lists (deleted) is not asked for in a loop.
	const sought = useRef(new Set<string>());
	const lookups = useRef(0);
	// A read again that answers the same files leaves the data as it was: its time still tells the lookup it is done.
	const { refetch, fetchNextPage, hasNextPage, isFetching, isSuccess, dataUpdatedAt } = query;

	useEffect(() => {
		if (!missingKey || !isSuccess || isFetching) return;
		const fresh = missing.filter((id) => !sought.current.has(id));
		if (fresh.length) {
			for (const id of fresh) sought.current.add(id);
			lookups.current = 0;
			void refetch();
			return;
		}
		if (hasNextPage && lookups.current < MAX_LOOKUP_PAGES) {
			lookups.current += 1;
			void fetchNextPage();
		}
	}, [dataUpdatedAt, fetchNextPage, hasNextPage, isFetching, isSuccess, missing, missingKey, refetch]);

	const loadMore = useCallback(() => {
		if (hasNextPage && !query.isFetchingNextPage) void fetchNextPage();
	}, [fetchNextPage, hasNextPage, query.isFetchingNextPage]);

	// Stable, so the rows a broken picture asks it of are not drawn again each time a read starts or ends.
	const fetching = useRef(isFetching);
	useIsomorphicLayoutEffect(() => {
		fetching.current = isFetching;
	});
	const refresh = useCallback(() => {
		if (!fetching.current) void refetch();
	}, [refetch]);

	return {
		files,
		byId,
		hasMore: !!hasNextPage,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		isLoadingMore: query.isFetchingNextPage,
		loadMore,
		refresh
	};
}
