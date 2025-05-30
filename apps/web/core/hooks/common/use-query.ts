'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * A custom React hook that provides a way to execute a query function and manage its loading state.
 *
 * @param queryFunction - A function that returns a Promise and takes any number of parameters.
 * @returns An object containing the following properties:
 *   - `queryCall`: A memoized version of the `queryFunction` that manages the loading state.
 *   - `loading`: A boolean indicating whether the query is currently loading.
 *   - `infiniteLoading`: A ref that can be used to track whether the query is part of an infinite loading scenario.
 *   - `loadingRef`: A ref that can be used to access the current loading state.
 */
export function useQueryCall<T extends (...params: any[]) => Promise<any>, R = Awaited<ReturnType<T>>>(
	queryFunction: T
): {
	queryCall: (...params: Parameters<T>) => Promise<R>;
	loading: boolean;
	infiniteLoading: React.RefObject<boolean>;
	loadingRef: React.RefObject<boolean>;
} {
	const [loading, setLoading] = useState(false);
	const loadingRef = useRef(false);
	const infiniteLoading = useRef(false);

	const queryCall = useCallback((...params: Parameters<T>): Promise<R> => {
		setLoading(true);
		loadingRef.current = true;

		const promise = queryFunction(...params);
		promise.finally(() => {
			if (!infiniteLoading.current) {
				setLoading(false);

				loadingRef.current = false;
			}
		});
		promise.catch(() => {
			setLoading(false);
			loadingRef.current = false;
		});
		return promise;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { queryCall, loading, infiniteLoading, loadingRef };
}
