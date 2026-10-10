'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { everStatsService } from '@/core/services/client/api/ever-platform/ever-stats.service';
import { useEverPlatformScope } from './use-ever-connect';

/**
 * The anonymous usage statistics card: this web app's /api/ever-stats routes, which answer the
 * operator's view only after the paired API accepted the signed-in person as the operator.
 */
export function useEverStatsView(enabled = true) {
	const scope = useEverPlatformScope();
	return useQuery({
		queryKey: queryKeys.everPlatform.stats.view(scope.tenantId, scope.userId),
		queryFn: ({ signal }) => everStatsService.view(signal),
		enabled: enabled && scope.signedIn,
		retry: false,
		refetchOnWindowFocus: false
	});
}

/** The exact bytes of the last reports (operator only). */
export function useEverStatsLast(enabled: boolean) {
	const scope = useEverPlatformScope();
	return useQuery({
		queryKey: queryKeys.everPlatform.stats.last(scope.tenantId, scope.userId),
		queryFn: ({ signal }) => everStatsService.last(signal),
		enabled: enabled && scope.signedIn,
		retry: false,
		refetchOnWindowFocus: false
	});
}

/** The operator's switch, stored in the paired API. */
export function useSetEverStatsEnabled() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) => everStatsService.setEnabled(enabled),
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.everPlatform.stats.all })
	});
}
