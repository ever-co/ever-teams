'use client';

import { useEffect, useMemo, useRef } from 'react';
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
import { trackPromptDelivery } from '@/core/lib/realtime/delivery';
import { realtimeService } from '@/core/services/client/api/realtime';
import { realtimePromptDeliveryAtom, realtimeStatusAtom } from '@/core/stores/common/realtime';

/**
 * Keeps the tab's one live connection while a user is signed in and the deployment turns the channel on:
 * opens it with the session's credential, publishes every event on the in-tab bus, turns change hints into
 * refetches (folded, and held while the user types in the affected area), and refetches everything on a
 * resynchronisation. A refreshed token reopens the socket on the same client — its cursor and the refetches it
 * holds survive, so the gap is replayed — while a sign-out, a user or a workspace change closes it and starts
 * afresh. Flag off or no socket URL: nothing is opened and polling stays as it is.
 */
export function useRealtimeClient(): void {
	const enabled = isRealtimeEnabled();
	const socketUrl = enabled ? realtimeSocketUrl() : null;
	const accessToken = useReactiveAccessTokenCookie();
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient();
	const setStatus = useSetAtom(realtimeStatusAtom);
	const setPromptDelivery = useSetAtom(realtimePromptDeliveryAtom);
	const hasToken = !!accessToken;
	const tokenRef = useRef(accessToken);
	const clientRef = useRef<RealtimeClient | null>(null);

	const tenantId = user?.employee?.tenantId ?? user?.tenantId ?? null;
	const organizationId = user?.employee?.organizationId ?? null;
	const employeeId = user?.employee?.id ?? null;
	const userId = user?.id ?? null;
	const scope = useMemo<RealtimeScope>(
		() => ({ tenantId, organizationId, employeeId, userId }),
		[tenantId, organizationId, employeeId, userId]
	);

	useEffect(() => {
		if (!socketUrl || !hasToken || !tenantId || !userId) {
			setStatus('off');
			setPromptDelivery(false);
			return;
		}

		const scheduler = new InvalidationScheduler({
			invalidate: (queryKey) => void queryClient.invalidateQueries({ queryKey }),
			isEditing: () => typeof document !== 'undefined' && isTextFieldFocused(document)
		});
		const client = new RealtimeClient({
			socketUrl,
			credentials: () => {
				const token = getAccessTokenCookie() ?? tokenRef.current;
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
		// Each time the connection comes up, ask the platform whether it pushes promptly: only then may the
		// connection stand in for the polls (`realtimePausesPollingAtom`). A redeploy can change the answer, a
		// failed question keeps the polls, and only the latest question counts.
		const delivery = trackPromptDelivery(() => realtimeService.status(), setPromptDelivery);
		const offStatus = client.onStatus((status) => {
			setStatus(status);
			void delivery.onStatus(status);
		});
		// Leaving a text field runs what was held for it.
		const onFocusOut = () => scheduler.flush();
		if (typeof document !== 'undefined') document.addEventListener('focusout', onFocusOut);

		clientRef.current = client;
		client.start();

		return () => {
			delivery.dispose();
			clientRef.current = null;
			if (typeof document !== 'undefined') document.removeEventListener('focusout', onFocusOut);
			offEvent();
			offResync();
			offStatus();
			client.stop();
			scheduler.dispose();
			setStatus('off');
			setPromptDelivery(false);
		};
	}, [socketUrl, hasToken, tenantId, organizationId, userId, scope, queryClient, setStatus, setPromptDelivery]);

	// A refreshed token: the same client reconnects with it (the socket keeps the credential it opened with).
	useEffect(() => {
		const previous = tokenRef.current;
		tokenRef.current = accessToken;
		if (previous && accessToken && previous !== accessToken) clientRef.current?.restart();
	}, [accessToken]);
}
