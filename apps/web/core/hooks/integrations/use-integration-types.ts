import { integrationTypesState } from '@/core/stores';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { integrationService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useAtom(integrationTypesState);

	// Memoize tenantId to avoid re-reading cookie on every render
	const tenantId = useMemo(() => getTenantIdCookie() || '', []);

	const queryFn = useCallback(() => integrationService.getIntegrationTypes(), []);

	// React Query for integration types data
	const integrationTypesQuery = useQuery({
		queryKey: queryKeys.integrations.types(tenantId),
		queryFn,
		enabled: !!tenantId,
		staleTime: 1000 * 60 * 30, // Integration types are stable, cache for 30 minutes
		gcTime: 1000 * 60 * 60 // Keep in cache for 1 hour
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
		error: integrationTypesQuery.error,
		getIntegrationTypes,
		integrationTypes
	};
}
