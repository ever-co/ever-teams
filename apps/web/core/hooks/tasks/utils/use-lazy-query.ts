import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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
