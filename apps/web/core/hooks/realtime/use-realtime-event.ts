'use client';

import { useEffect, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { realtimeBus } from '@/core/lib/realtime/bus';
import type { RealtimeEnvelope } from '@/core/lib/realtime/events';

/**
 * Listens to the events of some names (exact, or one-segment patterns such as `chat_message.*`) on the tab's
 * shared connection. The handler always sees the latest render's closure. Nothing is opened per caller: when
 * the channel is off, the handler is simply never called.
 *
 * @param names The names to listen to; `null` for every event.
 * @param handler What to do with one.
 */
export function useRealtimeEvent(names: readonly string[] | null, handler: (envelope: RealtimeEnvelope) => void): void {
	const latest = useRef(handler);
	// Not during render: the handler is only called after commit, and React keeps refs out of render.
	useIsomorphicLayoutEffect(() => {
		latest.current = handler;
	});
	const key = names ? names.join('|') : '*';

	useEffect(() => {
		const selection = key === '*' ? null : key.split('|');
		return realtimeBus.on(selection, (envelope) => latest.current(envelope));
	}, [key]);
}

/** Runs the handler when the platform tells the tab to resynchronise (refetch through the read APIs). */
export function useRealtimeResync(handler: () => void): void {
	const latest = useRef(handler);
	useIsomorphicLayoutEffect(() => {
		latest.current = handler;
	});

	useEffect(() => realtimeBus.onResync(() => latest.current()), []);
}
