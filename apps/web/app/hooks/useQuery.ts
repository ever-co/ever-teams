import { useCallback, useRef, useState } from 'react';

export function useQuery<T extends (...params: any[]) => Promise<any>>(queryFunction: T) {
	const [loading, setLoading] = useState(false);
	const loadingRef = useRef(false);
	const infiniteLoading = useRef(false);

	const queryCall = useCallback((...params: Parameters<T>) => {
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
	}, []) as T;

	return { queryCall, loading, infiniteLoading, loadingRef };
}
