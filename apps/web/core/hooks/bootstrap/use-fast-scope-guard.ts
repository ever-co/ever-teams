'use client';

import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Gives atom bridges a render-generation guard and cancels the exact previous scoped query.
 * Query data remains cached by scope; only obsolete in-flight work is cancelled.
 */
export function useFastScopeGuard(queryKey: QueryKey, active: boolean) {
	const queryClient = useQueryClient();
	const fingerprint = JSON.stringify(queryKey);
	const currentRef = useRef({ fingerprint, generation: 0 });
	const previousRef = useRef<{ fingerprint: string; queryKey: QueryKey } | null>(null);

	if (currentRef.current.fingerprint !== fingerprint) {
		currentRef.current = {
			fingerprint,
			generation: currentRef.current.generation + 1
		};
	}
	const generation = currentRef.current.generation;

	useEffect(() => {
		if (!active) return;

		const previous = previousRef.current;
		if (previous && previous.fingerprint !== fingerprint) {
			void queryClient.cancelQueries({ queryKey: previous.queryKey, exact: true });
		}
		previousRef.current = { fingerprint, queryKey };
		// queryKey identity is intentionally represented by its stable fingerprint.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, fingerprint, queryClient]);

	return useCallback(
		() => active && currentRef.current.fingerprint === fingerprint && currentRef.current.generation === generation,
		[active, fingerprint, generation]
	);
}
