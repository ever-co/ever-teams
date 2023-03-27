import { useCallback, useRef, useState } from 'react';

export function useQuery<T extends (...params: any[]) => Promise<any>>(
	queryFunction: T
) {
	const [loading, setLoading] = useState(false);
	const infiniteLoading = useRef(false);

	const queryCall = useCallback((...params: Parameters<T>) => {
		setLoading(true);

		const promise = queryFunction(...params);
		promise.finally(() => {
			!infiniteLoading.current && setLoading(false);
		});
		promise.catch(() => {
			setLoading(false);
		});
		return promise;
	}, []) as T;

	return { queryCall, loading, infiniteLoading };
}
