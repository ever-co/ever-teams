'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import { isChatLinkPreviewPicturesEnabled } from '@/core/lib/utils/chat-enabled';
import { useChatScope } from './use-chat-scope';

/** How long a picture nobody shows stays in memory. */
const PICTURE_GC_MS = 30 * 60_000;
/** A busy platform (429, 503) is asked again this many times, a while apart; then the card stays text only. */
const PICTURE_RETRIES = 2;
const PICTURE_RETRY_DELAY_MS = 5_000;

/** What the page learned about pictures: a platform with them off (404) is not asked again for any link. */
const offFor = new WeakMap<QueryClient, boolean>();

function statusOf(error: unknown): number | null {
	const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
	return typeof status === 'number' ? status : null;
}

/**
 * The picture of a link's preview card, as the platform serves it (`/chat/link-preview/image`): a picture only when
 * `NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED` is on and the preview names one. The platform fetched the picture;
 * the browser shows it from the bytes the platform answered (an object URL), never from the linked site. A link
 * without a picture (204) gets none; a platform with pictures off (404) is not asked again for the page; a busy one
 * (429, 503) is asked a couple more times. Answers the object URL to show, or null.
 */
export function useChatLinkPreviewPicture(url: string, hasPicture: boolean): string | null {
	const client = useQueryClient();
	const scope = useChatScope();
	const enabled = isChatLinkPreviewPicturesEnabled() && hasPicture && scope !== null && !offFor.get(client);
	const { data } = useQuery({
		queryKey: queryKeys.chatLinkPreviewPicture(scope?.tenantId, url),
		queryFn: async ({ signal }) => {
			try {
				return await chatService.linkPreviewImage(url, signal);
			} catch (error) {
				if (statusOf(error) === 404) {
					offFor.set(client, true);
					return null;
				}
				throw error;
			}
		},
		enabled,
		staleTime: Infinity,
		gcTime: PICTURE_GC_MS,
		retry: (count, error) => {
			const status = statusOf(error);
			return (status === 429 || status === 503) && count < PICTURE_RETRIES;
		},
		retryDelay: PICTURE_RETRY_DELAY_MS,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});

	// One object URL per picture shown, released when the card goes or the picture changes.
	const [objectUrl, setObjectUrl] = useState<string | null>(null);
	useEffect(() => {
		if (!data || !enabled) {
			setObjectUrl(null);
			return;
		}
		const next = URL.createObjectURL(data);
		setObjectUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [data, enabled]);
	return objectUrl;
}
