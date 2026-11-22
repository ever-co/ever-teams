import { queryKeys } from '@/core/query/keys';
import { userService } from '@/core/services/client/api/users/user.service';
import { useQuery } from '@tanstack/react-query';

import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { userReadRetryDelay } from '@/core/lib/utils/user-read-retry';
import { useCallback } from 'react';
export const useUserQuery = () => {
	const checkTokenExist = useCallback((): boolean => {
		const token = getAccessTokenCookie();
		return typeof token === 'string' && token.length > 0;
	}, [getAccessTokenCookie]);
	const hasToken = checkTokenExist();
	return useQuery({
		queryKey: queryKeys.users.me,
		queryFn: async () => {
			return await userService.getAuthenticatedUserData();
		},
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: true,
		refetchOnReconnect: hasToken,
		refetchInterval: (query) => userReadRetryDelay(query.state),
		// Dozens of components read the user, some only while it is missing: were each mount to read again after a
		// failure, a page waiting for the user would ask the API in a loop. The interval above asks instead.
		retryOnMount: false,
		enabled: hasToken
	});
};
