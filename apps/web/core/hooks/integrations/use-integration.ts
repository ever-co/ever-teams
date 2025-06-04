'use client';
import { integrationService } from '@/core/services/client/api';
import { integrationState } from '@/core/stores';
import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

export function useIntegration(integrationTypeId?: string, searchQuery?: string) {
	const [integration, setIntegration] = useAtom(integrationState);

	// State to track current query parameters for React Query
	const [queryParams, setQueryParams] = useState<{
		integrationTypeId: string;
		searchQuery: string;
	} | null>(null);

	// Initialize query params when hook parameters change
	useEffect(() => {
		if (integrationTypeId) {
			setQueryParams({
				integrationTypeId,
				searchQuery: searchQuery || ''
			});
		}
	}, [integrationTypeId, searchQuery]);

	// React Query for integration data with dynamic parameters
	const integrationQuery = useQuery({
		queryKey: queryParams
			? queryKeys.integrations.byTypeAndQuery(queryParams.integrationTypeId, queryParams.searchQuery)
			: ['integrations', 'disabled'],
		queryFn: () => integrationService.getIntegration(queryParams!.integrationTypeId, queryParams!.searchQuery),
		enabled: !!queryParams, // Only fetch when parameters are set
		staleTime: 1000 * 60 * 30, // Integrations change moderately, cache for 30 minutes
		gcTime: 1000 * 60 * 60 // Keep in cache for 1 hour
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (integrationQuery.data) {
			// Cast to any for backward compatibility with existing interfaces
			setIntegration(integrationQuery.data as any);
		}
	}, [integrationQuery.data, setIntegration]);

	// Manual fetch function that triggers React Query (maintains backward compatibility)
	const getIntegration = useCallback(
		async (integrationTypeId: string, searchQuery = '') => {
			// Set query parameters to trigger React Query
			setQueryParams({ integrationTypeId, searchQuery });

			// If we already have cached data for these params, return it immediately
			const cachedData = integrationQuery.data;
			if (cachedData && !integrationQuery.isStale) {
				return cachedData;
			}

			// Otherwise wait for the query to complete
			const result = await integrationQuery.refetch();
			return result.data || [];
		},
		[integrationQuery]
	);

	return {
		loading: integrationQuery.isLoading,
		getIntegration,
		integration,
		error: integrationQuery.error,
		isError: integrationQuery.isError,
		refetch: integrationQuery.refetch
	};
}
