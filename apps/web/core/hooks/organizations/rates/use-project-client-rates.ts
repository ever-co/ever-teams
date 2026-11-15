'use client';

import { useCallback, useMemo } from 'react';
import { useQueries, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { rateService } from '@/core/services/client/api/organizations/rate.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { isRatesReadUnavailable } from '@/core/lib/utils/rates';
import type { TProjectRates } from '@/core/types/schemas/organization/rates.schema';

export interface ProjectRatesState {
	rates: TProjectRates | null;
	isLoading: boolean;
	isRefreshing: boolean;
	hasFailed: boolean;
}

/** A read the API refuses (403) or does not serve (404) is not tried again: it will answer the same. */
export function retriesRatesRead(failureCount: number, error: unknown) {
	if (isRatesReadUnavailable(error)) {
		return false;
	}
	return failureCount < 2;
}

/**
 * A project whose client rates the API does not serve (404, an API without those routes) or refuses (403) has none
 * here: its time is priced at each member's own rate, as everywhere else in the app. Any other failure is an error.
 */
export function projectRatesStatesOf(results: ReadonlyArray<UseQueryResult<TProjectRates>>): ProjectRatesState[] {
	return results.map((result) => {
		const isUnavailable = isRatesReadUnavailable(result.error);
		// Rates read before the API refused or stopped serving them are not used: they may no longer apply
		let rates = result.data ?? null;
		if (isUnavailable) {
			rates = null;
		}
		// A first read paused while offline has not answered yet: it waits, it does not price at a fallback
		const isPausedFirstRead = result.isPending === true && result.fetchStatus === 'paused';
		return {
			rates,
			isLoading: result.isLoading || isPausedFirstRead,
			isRefreshing: result.isFetching && !result.isLoading,
			hasFailed: result.isError && !isUnavailable
		};
	});
}

/**
 * The client rates of each project, read as the invoice reads them (one cache per project), for a report that prices
 * time like an invoice line. Pass the ids in a stable order: each read keeps its key across renders.
 */
export function useProjectClientRates(projectIds: ReadonlyArray<string>, isEnabled: boolean) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const queryClient = useQueryClient();

	const states = useQueries({
		queries: projectIds.map((projectId) => ({
			queryKey: queryKeys.rates.project(tenantId, organizationId, projectId),
			queryFn: () => rateService.getProjectRates(projectId),
			enabled: isEnabled,
			retry: retriesRatesRead
		})),
		combine: projectRatesStatesOf
	});

	const ratesByProject = useMemo(() => {
		const byProject = new Map<string, TProjectRates | null>();
		states.forEach((state, index) => byProject.set(projectIds[index], state.rates));
		return byProject;
	}, [projectIds, states]);

	const isAnyLoading = states.some((state) => state.isLoading);
	const hasFailed = states.some((state) => state.hasFailed);

	const refetch = useCallback(() => {
		void queryClient.refetchQueries({ queryKey: queryKeys.rates.all, type: 'active' });
	}, [queryClient]);

	return { ratesByProject, isLoading: isEnabled && isAnyLoading, hasFailed: isEnabled && hasFailed, refetch };
}
