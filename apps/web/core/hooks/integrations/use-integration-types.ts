import { integrationTypesState } from '@/core/stores';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { integrationService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { IIntegrationType } from '@/core/types/interfaces/integrations/integration-type';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useAtom(integrationTypesState);

	// Memoize tenantId to avoid re-reading cookie on every render
	const tenantId = useMemo(() => getTenantIdCookie() || '', []);

	// React Query for integration types data
	const integrationTypesQuery = useQuery({
		queryKey: queryKeys.integrations.types(tenantId),
		queryFn: integrationService.getIntegrationTypes,
		enabled: !!tenantId,
		staleTime: 1000 * 60 * 30, // Integration types are stable, cache for 30 minutes
		gcTime: 1000 * 60 * 60 // Keep in cache for 1 hour
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (integrationTypesQuery.data) {
			// Cast to any for backward compatibility with existing interfaces
			setIntegrationTypes(integrationTypesQuery.data as IIntegrationType[]);
		}
	}, [integrationTypesQuery.data, setIntegrationTypes]);

	// Manually fetch integration types data
	// OPTIMIZATION: Let React Query handle caching automatically instead of manual refetch
	const getIntegrationTypes = useCallback(async () => {
		// React Query will handle caching, stale time, and refetching automatically
		// No need for manual refetch - this follows React Query best practices
		// The data will be available through the integrationTypesQuery.data
		return integrationTypesQuery.data ?? [];
	}, [integrationTypesQuery.data]);

	return {
		loading: integrationTypesQuery.isLoading,
		error: integrationTypesQuery.error,
		getIntegrationTypes,
		integrationTypes
	};
}
