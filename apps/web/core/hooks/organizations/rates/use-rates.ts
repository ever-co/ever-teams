'use client';

import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { rateService } from '@/core/services/client/api/organizations/rate.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { isRatesReadUnavailable, rateValueOf } from '@/core/lib/utils/rates';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type {
	IEmployeeRatesInput,
	IOwnProfileRatesInput,
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

export interface EmployeePayRates {
	/** The pay rates read, by employee id; one that is not set or cannot be read (403, 404) is left out. */
	rates: ReadonlyMap<string, number>;
	/** The employees whose pay rate read has not answered yet. */
	pendingIds: ReadonlySet<string>;
}

interface PayRateReadState {
	rate: number | null;
	isLoading: boolean;
}

function payRateReadStatesOf(results: ReadonlyArray<UseQueryResult<TEmployeePayRate>>): PayRateReadState[] {
	return results.map((result) => ({ rate: rateValueOf(result.data?.payRateValue), isLoading: result.isLoading }));
}

function payRatesOf(employeeIds: ReadonlyArray<string>, states: ReadonlyArray<PayRateReadState>): EmployeePayRates {
	const rates = new Map<string, number>();
	const pendingIds = new Set<string>();
	states.forEach((state, index) => {
		const employeeId = employeeIds[index];
		if (state.isLoading) {
			pendingIds.add(employeeId);
			return;
		}
		if (state.rate === null) {
			return;
		}
		rates.set(employeeId, state.rate);
	});
	return { rates, pendingIds };
}

export function useEmployeePayRates(employeeIds: ReadonlyArray<string>): EmployeePayRates {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId && organizationId);
	const states = useQueries({
		queries: employeeIds.map((employeeId) => ({
			queryKey: queryKeys.rates.payRate(tenantId, organizationId, employeeId),
			queryFn: () => rateService.getEmployeePayRate(employeeId),
			enabled: hasScope,
			retry: retriesRatesRead,
			staleTime: PAY_RATES_STALE_TIME_MS
		})),
		combine: payRateReadStatesOf
	});
	return useMemo(() => payRatesOf(employeeIds, states), [employeeIds, states]);
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

function ownProfileRatesOf(rates: IEmployeeRatesInput): IOwnProfileRatesInput {
	const profileRates: IOwnProfileRatesInput = {};
	if (rates.billRateValue !== undefined) {
		profileRates.billRateValue = rates.billRateValue;
	}
	if (rates.billRateCurrency !== undefined) {
		profileRates.billRateCurrency = rates.billRateCurrency;
	}
	if (rates.reWeeklyLimit !== undefined) {
		profileRates.reWeeklyLimit = rates.reWeeklyLimit;
	}
	return profileRates;
}

/**
 * One's own rates, for a holder of CHANGE_OWN_RATES. A holder of ORG_EMPLOYEES_EDIT saves them, pay rate included,
 * through `PUT /employee/:id`; anyone else through their own profile, which takes no pay rate.
 */
export function useOwnRatesMutation(editsEmployees: boolean) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: ({ employeeId, rates }: { employeeId: string; rates: IEmployeeRatesInput }) => {
			if (editsEmployees) {
				return rateService.updateEmployeeRates(employeeId, rates);
			}
			return rateService.updateOwnProfileRates(employeeId, ownProfileRatesOf(rates));
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
			await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			await queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });
		},
		meta: { handlesOwnError: true }
	});
	return { saveOwnRates: mutation.mutateAsync };
}

export function useRateChangeRequest() {
	const mutation = useMutation({
		mutationFn: (input: IRateChangeRequestInput) => rateService.requestRateChange(input),
		meta: { handlesOwnError: true }
	});
	return { requestRateChange: mutation.mutateAsync, isSending: mutation.isPending };
}
