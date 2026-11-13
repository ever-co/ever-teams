'use client';

import { useEffect, useRef } from 'react';

import { useSyncRef } from './use-sync-ref';

/** Runs `run` once, when the component mounts, whatever re-renders (or the double effects of development) follow. */
export function useRunOnce(run: () => void) {
	const hasRunRef = useRef(false);
	const runRef = useSyncRef(run);

	useEffect(() => {
		if (hasRunRef.current) {
			return;
		}
		hasRunRef.current = true;
		runRef.current();
	}, [runRef]);
}
