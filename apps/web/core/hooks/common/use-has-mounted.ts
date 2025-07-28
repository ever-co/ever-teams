'use client';

import { useEffect, useRef, useState } from 'react';

export const useHasMounted = () => {
	const [mounted, setMounted] = useState<boolean>(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return { mounted };
};

/**
 * FIXED: Custom hook that executes a callback on dependency changes with conditional first render execution.
 * This version ensures consistent hook behavior to prevent "Rendered more hooks than during the previous render" errors.
 *
 * @param callback - The function to execute when dependencies change
 * @param dependencies - Array of dependencies to watch for changes
 * @param shouldSkipFirstRender - Whether to skip the first render (evaluated once on mount)
 */
export const useConditionalUpdateEffect = (
	callback: () => void | (() => void),
	dependencies: React.DependencyList,
	shouldSkipFirstRender: boolean | (() => boolean)
) => {
	const isFirstRender = useRef(true);
	const prevDeps = useRef<React.DependencyList>([]);
	// CRITICAL: Evaluate skip condition only once to ensure consistent hook behavior
	const skipFirstRef = useRef<boolean | undefined>(undefined);

	// Initialize skip condition only once on mount
	if (skipFirstRef.current === undefined) {
		skipFirstRef.current =
			typeof shouldSkipFirstRender === 'function' ? shouldSkipFirstRender() : shouldSkipFirstRender;
	}

	useEffect(() => {
		// Use the stable skip condition
		const skipFirst = skipFirstRef.current;

		// Check if dependencies have actually changed
		const depsChanged = !prevDeps.current || dependencies.some((dep, index) => dep !== prevDeps.current![index]);

		if (skipFirst && isFirstRender.current) {
			isFirstRender.current = false;
			prevDeps.current = dependencies;
			return;
		}

		// If we're not skipping first render, we still need to track it for subsequent calls
		if (isFirstRender.current) {
			isFirstRender.current = false;
		}

		// Only execute callback if dependencies have changed
		if (depsChanged) {
			prevDeps.current = dependencies;
			return callback();
		}
	}, dependencies);
};

/**
 * Alternative hook that only runs after the first render
 * More predictable behavior for syncing data
 */
export const useUpdateEffect = (callback: () => void | (() => void), dependencies: React.DependencyList) => {
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		return callback();
	}, dependencies);
};
