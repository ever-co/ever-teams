import { queryKeys } from '@/core/query/keys';
import { userService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';

import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { useCallback } from 'react';
export const useUserQuery = () => {
	const checkTokenExist = useCallback((): boolean => {
		const token = getAccessTokenCookie();
		return typeof token === 'string' && token.length > 0;
	}, [getAccessTokenCookie]);
	return useQuery({
		queryKey: queryKeys.users.me,
		queryFn: async () => {
			return await userService.getAuthenticatedUserData();
		},
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: true,
		refetchOnReconnect: checkTokenExist(),
		enabled: checkTokenExist()
	});
};
