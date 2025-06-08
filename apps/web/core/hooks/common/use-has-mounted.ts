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
 * Custom hook that executes a callback on dependency changes with conditional first render execution.
 * The condition is evaluated dynamically on each render.
 *
 * @param callback - The function to execute when dependencies change
 * @param dependencies - Array of dependencies to watch for changes
 * @param shouldSkipFirstRender - Whether to skip the first render
 */
export const useConditionalUpdateEffect = (
	callback: () => void | (() => void),
	dependencies: React.DependencyList,
	shouldSkipFirstRender: boolean | (() => boolean)
) => {
	const isFirstRender = useRef(true);

	useEffect(() => {
		const skipFirst = typeof shouldSkipFirstRender === 'function' ? shouldSkipFirstRender() : shouldSkipFirstRender;

		if (skipFirst && isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		// If we're not skipping first render, we still need to track it for subsequent calls
		if (isFirstRender.current) {
			isFirstRender.current = false;
		}

		return callback();
	}, dependencies);
};
