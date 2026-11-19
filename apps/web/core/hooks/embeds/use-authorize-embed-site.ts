'use client';

import { useMutation } from '@tanstack/react-query';
import { embedsService } from '@/core/services/client/api/embeds/embeds.service';
import type { EmbedSiteToAllow } from '@/core/lib/utils/embed-authorize';
import type { EmbedSiteTokens } from '@/core/types/schemas/embeds/embed.schema';

/**
 * Allows a site to start and stop the signed-in person's timer (`POST /embed/authorize`). The answer holds the site's
 * tokens: React Query drops it as soon as nothing shows it, and the page hands it to the site and resets the mutation.
 */
export function useAuthorizeEmbedSite() {
	return useMutation<EmbedSiteTokens, unknown, EmbedSiteToAllow>({
		mutationFn: ({ organizationId, origin }) => embedsService.authorizeSite(organizationId, origin),
		gcTime: 0,
		// The page says why the API refused: the global fallback toast would say it twice
		meta: { handlesOwnError: true }
	});
}
