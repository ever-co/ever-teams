'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { inboxDeliveryService, IInboxDeliveryStatus } from '@/core/services/client/api/inbox';
import { useNotificationScope } from '@/core/hooks/notifications/use-notification-scope';

/** How long an answer is trusted: the platform caches its own check for a few minutes too. */
const DELIVERY_STATUS_STALE_MS = 2 * 60_000;

/**
 * Which channels the Inbox can deliver through for the active organization (`GET /inbox/delivery/status`), or null
 * while unknown and when the platform does not say (an older one, or one without the delivery plugin). Read once per
 * organization; a change of organization reads it again.
 */
export function useInboxDeliveryStatus(): IInboxDeliveryStatus | null {
	const scope = useNotificationScope();
	const tenantId = scope?.tenantId ?? null;
	const organizationId = scope?.organizationId ?? null;
	const query = useQuery({
		queryKey: queryKeys.inbox.deliveryStatus(tenantId, organizationId),
		queryFn: () => inboxDeliveryService.status(),
		enabled: Boolean(tenantId && organizationId),
		staleTime: DELIVERY_STATUS_STALE_MS,
		retry: false
	});
	return query.data ?? null;
}
