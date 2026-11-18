/** @jest-environment jsdom */

import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useEmployeeRatesMutation, useOwnRatesMutation, useProjectRateMutations } from './use-rates';

const mockUpdateEmployeeRates = jest.fn();
const mockUpdateOwnProfileRates = jest.fn();
const mockUpdateProjectRate = jest.fn();
const mockUpdateProjectMemberRate = jest.fn();

jest.mock('@/core/services/client/api/organizations/rate.service', () => ({
	rateService: {
		updateEmployeeRates: (...args: unknown[]) => mockUpdateEmployeeRates(...args),
		updateOwnProfileRates: (...args: unknown[]) => mockUpdateOwnProfileRates(...args),
		updateProjectRate: (...args: unknown[]) => mockUpdateProjectRate(...args),
		updateProjectMemberRate: (...args: unknown[]) => mockUpdateProjectMemberRate(...args)
	}
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-admin', employee: { id: 'employee-admin' } } })
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

function renderMutation() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useEmployeeRatesMutation(), { wrapper });
	return { result, invalidated };
}

function invalidatedKeys(invalidated: jest.SpyInstance): unknown[] {
	return invalidated.mock.calls.map(([filters]) => filters?.queryKey);
}

const RATES = { billRateValue: 60, billRateCurrency: 'EUR', reWeeklyLimit: 40 };

beforeEach(() => {
	mockUpdateEmployeeRates.mockReset();
	mockUpdateEmployeeRates.mockResolvedValue(undefined);
	mockUpdateOwnProfileRates.mockReset();
	mockUpdateOwnProfileRates.mockResolvedValue(undefined);
});

describe('useEmployeeRatesMutation', () => {
	it('refreshes the signed-in user when an admin saves their own rate, so their profile shows it', async () => {
		const { result, invalidated } = renderMutation();

		await act(async () => {
			await result.current.saveEmployeeRates({ employeeId: 'employee-admin', rates: RATES });
		});

		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.users.me);
	});

	it("leaves the signed-in user alone when the rate saved is another member's", async () => {
		const { result, invalidated } = renderMutation();

		await act(async () => {
			await result.current.saveEmployeeRates({ employeeId: 'employee-ana', rates: RATES });
		});

		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.rates.all);
		expect(invalidatedKeys(invalidated)).not.toContainEqual(queryKeys.users.me);
	});
});

function renderOwnRatesMutation(editsEmployees: boolean) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useOwnRatesMutation(editsEmployees), { wrapper });
	return { result, invalidated };
}

const OWN_RATES = { billRateValue: 60, reWeeklyLimit: 30, payRateValue: 25 };

describe('useOwnRatesMutation', () => {
	it("saves an admin's own rates, pay rate included, through the employee route and refreshes their profile", async () => {
		const { result, invalidated } = renderOwnRatesMutation(true);

		await act(async () => {
			await result.current.saveOwnRates({ employeeId: 'employee-admin', rates: OWN_RATES });
		});

		expect(mockUpdateEmployeeRates).toHaveBeenCalledWith('employee-admin', OWN_RATES);
		expect(mockUpdateOwnProfileRates).not.toHaveBeenCalled();
		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.users.me);
	});

	it('saves through the own profile, without any pay rate, for someone who may not edit employees', async () => {
		const { result } = renderOwnRatesMutation(false);

		await act(async () => {
			await result.current.saveOwnRates({ employeeId: 'employee-ana', rates: OWN_RATES });
		});

		expect(mockUpdateOwnProfileRates).toHaveBeenCalledWith('employee-ana', {
			billRateValue: 60,
			reWeeklyLimit: 30
		});
		expect(mockUpdateEmployeeRates).not.toHaveBeenCalled();
	});
});

describe('the day a rate change applies from', () => {
	it('goes through the own profile with the rates it prices', async () => {
		const { result } = renderOwnRatesMutation(false);

		await act(async () => {
			await result.current.saveOwnRates({
				employeeId: 'employee-ana',
				rates: { billRateValue: 60, ratesApplyFrom: '2026-10-01T00:00:00Z' }
			});
		});

		expect(mockUpdateOwnProfileRates).toHaveBeenCalledWith('employee-ana', {
			billRateValue: 60,
			ratesApplyFrom: '2026-10-01T00:00:00Z'
		});
	});

	it("reads a member's rates again after a failed save, which Gauzy may have written before re-pricing failed", async () => {
		mockUpdateEmployeeRates.mockRejectedValue({ status: 500 });
		const { result, invalidated } = renderMutation();

		await act(async () => {
			await result.current
				.saveEmployeeRates({
					employeeId: 'employee-ana',
					rates: { billRateValue: 60, ratesApplyFrom: '2026-10-01T00:00:00Z' }
				})
				.catch(() => undefined);
		});

		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.rates.all);
		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.organizationTeams.all);
	});

	it("reads one's own rates again after a failed save, for the same reason", async () => {
		mockUpdateOwnProfileRates.mockRejectedValue({ status: 500 });
		const { result, invalidated } = renderOwnRatesMutation(false);

		await act(async () => {
			await result.current
				.saveOwnRates({ employeeId: 'employee-ana', rates: { billRateValue: 60 } })
				.catch(() => undefined);
		});

		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.users.me);
		expect(invalidatedKeys(invalidated)).toContainEqual(queryKeys.rates.all);
	});

	it('answers how many entries changed price, as Gauzy states it', async () => {
		mockUpdateEmployeeRates.mockResolvedValue({ repricedTimeLogs: 7 });
		const { result } = renderMutation();

		let outcome: unknown;
		await act(async () => {
			outcome = await result.current.saveEmployeeRates({ employeeId: 'employee-ana', rates: RATES });
		});

		expect(outcome).toEqual({ repricedTimeLogs: 7 });
	});
});

describe('a client rate saved on a project (CORE-29)', () => {
	function renderProjectMutations() {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useProjectRateMutations('project-site'), { wrapper });
		return { result, invalidated };
	}

	beforeEach(() => {
		mockUpdateProjectRate.mockResolvedValue({ id: 'project-site', billRateValue: 110 });
		mockUpdateProjectMemberRate.mockResolvedValue({ employeeId: 'employee-ana', billRateValue: 120 });
	});

	it.each([
		[
			'the project’s rate',
			(save: ReturnType<typeof useProjectRateMutations>) => save.saveProjectRate({ billRateValue: 110 })
		],
		[
			'a member’s rate on it',
			(save: ReturnType<typeof useProjectRateMutations>) =>
				save.saveMemberRate({ employeeId: 'employee-ana', billRateValue: 120 })
		]
	])(
		'reads the time priced at the rates it kept again after %s is saved: past time may be re-priced',
		async (_rate, save) => {
			const { result, invalidated } = renderProjectMutations();

			await act(async () => {
				await save(result.current);
			});

			expect(invalidatedKeys(invalidated)).toEqual(
				expect.arrayContaining([queryKeys.rates.all, queryKeys.timesheet.reports.all, queryKeys.activities.all])
			);
		}
	);
});
