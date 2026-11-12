'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import { isChatLinkPreviewPicturesEnabled } from '@/core/lib/utils/chat-enabled';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { useChatScope } from './use-chat-scope';

/** How long a picture nobody shows stays in memory. */
const PICTURE_GC_MS = 30 * 60_000;
/** A busy platform (429, 503) is asked again this many times, a while apart; then the card stays text only. */
const PICTURE_RETRIES = 2;
const PICTURE_RETRY_DELAY_MS = 5_000;

/** What the page learned about pictures: a platform with them off (404) is not asked again for any link. */
const offFor = new WeakMap<QueryClient, boolean>();

/**
 * The picture of a link's preview card, as the platform serves it (`/chat/link-preview/image`): a picture only when
 * `NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED` is on and the preview names one. `url` is the link as the platform
 * keys it (no fragment), so links to one page share one picture. The platform fetched the picture; the browser shows
 * it from the bytes the platform answered (see `useObjectUrlRef`), never from the linked site. A link without a
 * picture (204) gets none; a platform with pictures off (404) is not asked again for the page; a busy one (429, 503) is
 * asked a couple more times. Answers the picture's bytes, or null.
 */
export function useChatLinkPreviewPicture(url: string, hasPicture: boolean): Blob | null {
	const client = useQueryClient();
	const scope = useChatScope();
	const isShown = isChatLinkPreviewPicturesEnabled() && hasPicture;
	const { data, error } = useQuery({
		queryKey: queryKeys.chatLinkPreviewPicture(scope?.tenantId, url),
		// A retry runs a while after it was decided: by then another card may have learned that pictures are off.
		queryFn: async ({ signal }) => (offFor.get(client) ? null : chatService.linkPreviewImage(url, signal)),
		enabled: isShown && scope !== null && !offFor.get(client),
		staleTime: Infinity,
		gcTime: PICTURE_GC_MS,
		retry: (count, failure) => {
			const status = errorStatusOf(failure);
			return (status === 429 || status === 503) && count < PICTURE_RETRIES;
		},
		retryDelay: PICTURE_RETRY_DELAY_MS,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});

	// The platform said pictures are off: no card of the page asks again (the query itself only fetches).
	const isOff = errorStatusOf(error) === 404;
	useEffect(() => {
		if (isOff) offFor.set(client, true);
	}, [isOff, client]);

	return isShown && data ? data : null;
}
