import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	currentUserOrganizationState,
	currentUserOrganizationFetchingState
} from '@/core/stores/user/user-organizations';
import { useAtom } from 'jotai';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { organizationService } from '@/core/services/client/api/organizations';
import { useEffect } from 'react';

export const useCurrentUserOrganization = () => {
	const [, setCurrentUserOrganization] = useAtom(currentUserOrganizationState);
	const [, setCurrentUserOrganizationFetching] = useAtom(currentUserOrganizationFetchingState);
	const organizationId = getOrganizationIdCookie();

	const currentUserOrganizationQuery = useQuery({
		queryKey: queryKeys.users.currentOrganization(organizationId),
		queryFn: async () => {
			return await organizationService.getOrganizationById(organizationId);
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 60, // 1h
		gcTime: 1000 * 60 * 60 * 2, // 2h
		retry: 2
	});

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (currentUserOrganizationQuery.data) {
			setCurrentUserOrganization(currentUserOrganizationQuery.data);
		}
	}, [currentUserOrganizationQuery.data]);

	// Track fetching state
	useEffect(() => {
		setCurrentUserOrganizationFetching(currentUserOrganizationQuery.isLoading);
	}, [currentUserOrganizationQuery.isLoading]);
};
