import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

/**
 * Generic utility for creating lazy/imperative query patterns.
 * Manages loading state and provides fetch function wrapper.
 *
 * @template T - Return type of the fetch function
 * @param fetchFn - Async function to execute
 * @returns {{ execute: () => Promise<T>, isPending: boolean, data: T | null }}
 */
export const useLazyQueryState = <T extends QueryKey = QueryKey>() => {
	const queryClient = useQueryClient();
	const [queryKey, setQueryKey] = useState<T | null>(null);
	const state = queryKey ? queryClient.getQueryState(queryKey) : null;
	const status = useMemo(
		() => ({
			isIdle: state === null, // No query key set yet
			isError: state?.status == 'error',
			isPending: state?.status == 'pending',
			isSuccess: state?.status == 'success',
			isLoading: state?.status == 'pending' && state?.fetchStatus == 'fetching'
		}),
		[state?.status, state?.fetchStatus, state]
	);

	return { setQueryKey, ...status, ...(state && { ...state }) };
};
