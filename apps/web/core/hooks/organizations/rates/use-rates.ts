'use client';

import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { rateService } from '@/core/services/client/api/organizations/rate.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { isRatesReadUnavailable, rateValueOf } from '@/core/lib/utils/rates';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type {
	IEmployeeRatesInput,
	IRateChangeRequestInput,
	TEmployeePayRate
} from '@/core/types/schemas/organization/rates.schema';

function retriesRatesRead(failureCount: number, error: unknown): boolean {
	if (isRatesReadUnavailable(error)) {
		return false;
	}
	return failureCount < 2;
}

export function useProjectRates(projectId: string | undefined, enabled: boolean) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId && organizationId && projectId);
	const query = useQuery({
		queryKey: queryKeys.rates.project(tenantId, organizationId, projectId),
		queryFn: () => rateService.getProjectRates(projectId as string),
		enabled: enabled && hasScope,
		retry: retriesRatesRead
	});
	const isUnavailable = isRatesReadUnavailable(query.error);
	return { ...query, isUnavailable };
}

/** An employee's pay rate. A 404 (a Gauzy without pay rates) or a 403 leaves it unavailable, never an error. */
export function useEmployeePayRate(employeeId: string | undefined, enabled: boolean) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId && organizationId && employeeId);
	const query = useQuery({
		queryKey: queryKeys.rates.payRate(tenantId, organizationId, employeeId),
		queryFn: () => rateService.getEmployeePayRate(employeeId as string),
		enabled: enabled && hasScope,
		retry: retriesRatesRead
	});
	const isUnavailable = isRatesReadUnavailable(query.error);
	return { ...query, isUnavailable };
}

const PAY_RATES_STALE_TIME_MS = 5 * 60 * 1000;

function payRatesByEmployeeOf(results: ReadonlyArray<UseQueryResult<TEmployeePayRate>>): ReadonlyMap<string, number> {
	const rates = new Map<string, number>();
	for (const result of results) {
		const payRate = result.data;
		if (!payRate) {
			continue;
		}
		const rate = rateValueOf(payRate.payRateValue);
		if (rate === null) {
			continue;
		}
		rates.set(payRate.employeeId, rate);
	}
	return rates;
}

/** The pay rates of several employees, by employee id; one that cannot be read (403, 404) is left out. */
export function useEmployeePayRates(employeeIds: ReadonlyArray<string>): ReadonlyMap<string, number> {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId && organizationId);
	return useQueries({
		queries: employeeIds.map((employeeId) => ({
			queryKey: queryKeys.rates.payRate(tenantId, organizationId, employeeId),
			queryFn: () => rateService.getEmployeePayRate(employeeId),
			enabled: hasScope,
			retry: retriesRatesRead,
			staleTime: PAY_RATES_STALE_TIME_MS
		})),
		combine: payRatesByEmployeeOf
	});
}

export function useProjectRateMutations(projectId: string) {
	const queryClient = useQueryClient();
	const invalidateRates = () => queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });

	const projectRate = useMutation({
		mutationFn: (billRateValue: number | null) => rateService.updateProjectRate(projectId, billRateValue),
		onSuccess: invalidateRates,
		meta: { handlesOwnError: true }
	});

	const memberRate = useMutation({
		mutationFn: ({ employeeId, billRateValue }: { employeeId: string; billRateValue: number | null }) =>
			rateService.updateProjectMemberRate(projectId, employeeId, billRateValue),
		onSuccess: invalidateRates,
		meta: { handlesOwnError: true }
	});

	return {
		saveProjectRate: projectRate.mutateAsync,
		saveMemberRate: memberRate.mutateAsync
	};
}

export function useEmployeeRatesMutation() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const ownEmployeeId = user?.employee?.id;
	const mutation = useMutation({
		mutationFn: ({ employeeId, rates }: { employeeId: string; rates: IEmployeeRatesInput }) =>
			rateService.updateEmployeeRates(employeeId, rates),
		onSuccess: async (_updated, { employeeId }) => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			await queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });
			const savesOwnRate = employeeId === ownEmployeeId;
			if (savesOwnRate) {
				await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
			}
		},
		meta: { handlesOwnError: true }
	});
	return { saveEmployeeRates: mutation.mutateAsync };
}

export function useRateChangeRequest() {
	const mutation = useMutation({
		mutationFn: (input: IRateChangeRequestInput) => rateService.requestRateChange(input),
		meta: { handlesOwnError: true }
	});
	return { requestRateChange: mutation.mutateAsync, isSending: mutation.isPending };
}
