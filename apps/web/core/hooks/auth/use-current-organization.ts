import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState, currentOrganizationFetchingState } from '@/core/stores/user/user-organizations';
import { useAtom } from 'jotai';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { organizationService } from '@/core/services/client/api/organizations';
import { useEffect } from 'react';

export const useGetCurrentOrganization = () => {
	const [, setCurrentOrganization] = useAtom(currentOrganizationState);
	const [, setCurrentOrganizationFetching] = useAtom(currentOrganizationFetchingState);
	const organizationId = getOrganizationIdCookie();

	const currentOrganizationQuery = useQuery({
		queryKey: queryKeys.auth.currentOrganization(organizationId),
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
		if (currentOrganizationQuery.data) {
			setCurrentOrganization(currentOrganizationQuery.data);
		}
	}, [currentOrganizationQuery.data, setCurrentOrganization]);

	// Track fetching state
	useEffect(() => {
		setCurrentOrganizationFetching(currentOrganizationQuery.isLoading);
	}, [currentOrganizationQuery.isLoading, setCurrentOrganizationFetching]);
};
