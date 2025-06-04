import { integrationTypesState } from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { integrationService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useAtom(integrationTypesState);
	const queryFn = useCallback(() => integrationService.getIntegrationTypes(), []);
	// React Query for integration types data
	const integrationTypesQuery = useQuery({
		queryKey: queryKeys.integrations.types(getTenantIdCookie() || ''),
		queryFn,
		enabled: !!getTenantIdCookie(),
		staleTime: 1000 * 60 * 10, // Integration types are stable, cache for 10 minutes
		gcTime: 1000 * 60 * 30 // Keep in cache for 30 minutes
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (integrationTypesQuery.data) {
			// Cast to any for backward compatibility with existing interfaces
			setIntegrationTypes(integrationTypesQuery.data as any);
		}
	}, [integrationTypesQuery.data, setIntegrationTypes]);

	// Manually fetch integration types data
	const getIntegrationTypes = useCallback(async () => {
		const result = await integrationTypesQuery.refetch();
		return result.data || [];
	}, [integrationTypesQuery]);

	return {
		loading: integrationTypesQuery.isLoading,
		getIntegrationTypes,
		integrationTypes
	};
}
