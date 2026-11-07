'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { realtimeBus } from '@/core/lib/realtime/bus';
import { RealtimeClient } from '@/core/lib/realtime/client';
import { isRealtimeEnabled, realtimeSocketUrl } from '@/core/lib/realtime/config';
import { invalidationsFor, RealtimeScope, resyncInvalidations } from '@/core/lib/realtime/invalidation';
import { InvalidationScheduler, isTextFieldFocused } from '@/core/lib/realtime/invalidation-scheduler';
import { realtimeService } from '@/core/services/client/api/realtime';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';

/**
 * Keeps the tab's one live connection while a user is signed in and the deployment turns the channel on:
 * opens it with the session's credential, publishes every event on the in-tab bus, turns change hints into
 * refetches (folded, and held while the user types in the affected area), and refetches everything on a
 * resynchronisation. A new credential (sign-in, token refresh, workspace switch) reopens the connection; a
 * sign-out closes it. Flag off or no socket URL: nothing is opened and polling stays as it is.
 */
export function useRealtimeClient(): void {
	const enabled = isRealtimeEnabled();
	const socketUrl = enabled ? realtimeSocketUrl() : null;
	const accessToken = useReactiveAccessTokenCookie();
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient();
	const setStatus = useSetAtom(realtimeStatusAtom);

	const tenantId = user?.employee?.tenantId ?? user?.tenantId ?? null;
	const organizationId = user?.employee?.organizationId ?? null;
	const employeeId = user?.employee?.id ?? null;
	const userId = user?.id ?? null;
	const scope = useMemo<RealtimeScope>(
		() => ({ tenantId, organizationId, employeeId, userId }),
		[tenantId, organizationId, employeeId, userId]
	);

	useEffect(() => {
		if (!socketUrl || !accessToken || !tenantId || !userId) {
			setStatus('off');
			return;
		}

		const scheduler = new InvalidationScheduler({
			invalidate: (queryKey) => void queryClient.invalidateQueries({ queryKey }),
			isEditing: () => typeof document !== 'undefined' && isTextFieldFocused(document)
		});
		const client = new RealtimeClient({
			socketUrl,
			credentials: () => {
				const token = getAccessTokenCookie() ?? accessToken;
				return token ? { accessToken: token, tenantId, organizationId } : null;
			},
			catchUp: (query) => realtimeService.catchUp(query),
			window: typeof window !== 'undefined' ? window : undefined
		});

		const offEvent = client.on((envelope) => {
			realtimeBus.emit(envelope);
			scheduler.add(invalidationsFor(envelope, scope));
		});
		const offResync = client.onResync(() => {
			realtimeBus.emitResync();
			scheduler.add(resyncInvalidations(scope));
		});
		const offStatus = client.onStatus(setStatus);
		// Leaving a text field runs what was held for it.
		const onFocusOut = () => scheduler.flush();
		if (typeof document !== 'undefined') document.addEventListener('focusout', onFocusOut);

		client.start();

		return () => {
			if (typeof document !== 'undefined') document.removeEventListener('focusout', onFocusOut);
			offEvent();
			offResync();
			offStatus();
			client.stop();
			scheduler.dispose();
			setStatus('off');
		};
	}, [socketUrl, accessToken, tenantId, organizationId, userId, scope, queryClient, setStatus]);
}
