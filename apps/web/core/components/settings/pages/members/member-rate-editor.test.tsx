/** @jest-environment jsdom */

import React from 'react';
import { getDefaultStore } from 'jotai';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { ALL_TIME_APPLY_FROM } from '@/core/lib/utils/rate-apply';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { MemberRateEditor, MemberRateText } from './member-rate-editor';

const mockUseGetCurrentOrganization = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { amount?: string }) =>
		[key, values?.amount].filter(Boolean).join(' '),
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useEmployeePayRate: () => ({ data: undefined, isLoading: false })
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: (options: { enabled?: boolean }) => mockUseGetCurrentOrganization(options)
}));
jest.mock('@/core/components/icons', () => ({ Spinner: () => null }));
jest.mock('./people-parts', () => ({ MemberAvatar: () => null }));
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));

function rowWithRate(value: number): MemberRowModel {
	return {
		id: 'row-ana',
		name: 'Ana Lima',
		imageUrl: null,
		employeeId: 'employee-ana',
		canEditRate: true,
		rate: { value, currency: 'EUR', weeklyLimit: 35 }
	} as unknown as MemberRowModel;
}

it('does not write back the rate it opened with when another admin changed it meanwhile', async () => {
	const onSaveRates = jest.fn().mockResolvedValue(undefined);
	const view = render(<MemberRateEditor row={rowWithRate(40)} onCancel={jest.fn()} onSaveRates={onSaveRates} />);

	view.rerender(<MemberRateEditor row={rowWithRate(50)} onCancel={jest.fn()} onSaveRates={onSaveRates} />);
	fireEvent.change(screen.getByLabelText('rates.WEEKLY_LIMIT'), { target: { value: '20' } });
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
	});

	expect(onSaveRates).toHaveBeenCalledWith('row-ana', { reWeeklyLimit: 20 });
});

describe('the currency of a rate without one of its own', () => {
	const rowWithoutRate = {
		id: 'row-bo',
		name: 'Bo Chen',
		imageUrl: null,
		employeeId: 'employee-bo',
		canEditRate: true,
		rate: { value: null, currency: null, weeklyLimit: null }
	} as unknown as MemberRowModel;

	afterEach(() => {
		getDefaultStore().set(currentOrganizationState, null);
	});

	it("starts in the workspace's currency, though the workspace is read after the form opened", async () => {
		render(<MemberRateEditor row={rowWithoutRate} onCancel={jest.fn()} onSaveRates={jest.fn()} />);

		expect(mockUseGetCurrentOrganization).toHaveBeenCalledWith({ enabled: true });
		await act(async () => {
			getDefaultStore().set(currentOrganizationState, { id: 'organization-1', currency: 'EUR' } as never);
		});

		expect((screen.getByLabelText('rates.CURRENCY') as HTMLSelectElement).value).toBe('EUR');
	});

	it('keeps a currency picked before the workspace was read', async () => {
		render(<MemberRateEditor row={rowWithoutRate} onCancel={jest.fn()} onSaveRates={jest.fn()} />);

		fireEvent.change(screen.getByLabelText('rates.CURRENCY'), { target: { value: 'GBP' } });
		await act(async () => {
			getDefaultStore().set(currentOrganizationState, { id: 'organization-1', currency: 'EUR' } as never);
		});

		expect((screen.getByLabelText('rates.CURRENCY') as HTMLSelectElement).value).toBe('GBP');
	});
});

describe('the question about the time already tracked', () => {
	function openWith(organization: Record<string, unknown> | null) {
		getDefaultStore().set(currentOrganizationState, organization as never);
		const onSaveRates = jest.fn().mockResolvedValue({ repricedTimeLogs: null });
		const onCancel = jest.fn();
		render(<MemberRateEditor row={rowWithRate(40)} onCancel={onCancel} onSaveRates={onSaveRates} />);
		return { onSaveRates, onCancel };
	}

	async function save() {
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});
	}

	function raiseRateTo(value: string) {
		fireEvent.change(screen.getByLabelText('rates.BILLING_RATE'), { target: { value } });
	}

	beforeEach(() => {
		mockToastSuccess.mockReset();
	});

	afterEach(() => {
		getDefaultStore().set(currentOrganizationState, null);
	});

	it('is not asked by a Gauzy that does not store rates on time entries, which saves as before', async () => {
		const { onSaveRates } = openWith({ id: 'organization-1', currency: 'EUR' });

		raiseRateTo('50');
		await save();

		expect(screen.queryByRole('radio')).toBeNull();
		expect(onSaveRates).toHaveBeenCalledWith('row-ana', { billRateValue: 50 });
		expect(mockToastSuccess).not.toHaveBeenCalled();
	});

	it('keeps the price of past time by default where time keeps its rate, and says so', async () => {
		const { onSaveRates, onCancel } = openWith({
			id: 'organization-1',
			currency: 'EUR',
			timeLogsKeepTheirRates: true
		});

		expect(screen.getByRole('radio', { name: /rates.APPLY_FROM_NOW/ })).toHaveProperty('checked', true);
		raiseRateTo('50');
		await save();

		expect(onSaveRates).toHaveBeenCalledWith('row-ana', { billRateValue: 50 });
		expect(mockToastSuccess).toHaveBeenCalledWith('rates.RATE_SAVED', { description: 'rates.PAST_TIME_KEPT' });
		expect(onCancel).toHaveBeenCalled();
	});

	it('re-prices from the start of a picked day, and says how many entries changed price', async () => {
		const { onSaveRates } = openWith({ id: 'organization-1', currency: 'EUR', timeLogsKeepTheirRates: true });
		onSaveRates.mockResolvedValue({ repricedTimeLogs: 12 });

		raiseRateTo('50');
		fireEvent.click(screen.getByRole('radio', { name: /rates.APPLY_FROM_DAY/ }));
		await save();

		expect(screen.getByRole('alert').textContent).toBe('rates.APPLY_DAY_MISSING');
		expect(onSaveRates).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText('rates.APPLY_DAY'), { target: { value: '2026-10-01' } });
		await save();

		const sent = onSaveRates.mock.calls[0][1];
		expect(sent.billRateValue).toBe(50);
		expect(new Date(sent.ratesApplyFrom).getTime()).toBe(new Date(2026, 9, 1).getTime());
		expect(mockToastSuccess).toHaveBeenCalledWith('rates.RATE_SAVED', { description: 'rates.ENTRIES_REPRICED' });
	});

	it('offers all of the time already tracked first where a new rate prices it, as before', async () => {
		const { onSaveRates } = openWith({ id: 'organization-1', currency: 'EUR', timeLogsKeepTheirRates: null });

		expect(screen.getByRole('radio', { name: /rates.APPLY_ALL_TIME/ })).toHaveProperty('checked', true);
		expect(screen.queryByRole('radio', { name: /rates.APPLY_FROM_NOW/ })).toBeNull();
		expect(screen.getByText('rates.APPLY_WORKSPACE_HINT')).toBeTruthy();
		expect(screen.getByText('rates.APPLY_BILLED_KEPT')).toBeTruthy();
		raiseRateTo('50');
		await save();

		// A day before any entry: without one Gauzy would re-price the time an invoice already bills
		expect(onSaveRates).toHaveBeenCalledWith('row-ana', {
			billRateValue: 50,
			ratesApplyFrom: ALL_TIME_APPLY_FROM
		});
	});

	it('says the rate may be saved without past time re-priced when the server fails a re-pricing save', async () => {
		const { onSaveRates, onCancel } = openWith({
			id: 'organization-1',
			currency: 'EUR',
			timeLogsKeepTheirRates: false
		});
		onSaveRates.mockRejectedValue({ status: 500 });

		raiseRateTo('50');
		await save();

		expect(screen.getByRole('alert').textContent).toBe('rates.REPRICE_UNFINISHED');
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('gives the plain reason when Gauzy refuses the save, which then wrote nothing', async () => {
		const { onSaveRates } = openWith({ id: 'organization-1', currency: 'EUR', timeLogsKeepTheirRates: false });
		onSaveRates.mockRejectedValue({ status: 403 });

		raiseRateTo('50');
		await save();

		expect(screen.getByRole('alert').textContent).toBe('toasts.REASONS.PERMISSION');
	});

	it('does not say "from now on" leaves billed time aside, as it re-prices nothing', () => {
		openWith({ id: 'organization-1', currency: 'EUR', timeLogsKeepTheirRates: true });

		expect(screen.queryByText('rates.APPLY_BILLED_KEPT')).toBeNull();
	});

	it('asks no day for a weekly limit alone', async () => {
		const { onSaveRates } = openWith({ id: 'organization-1', currency: 'EUR', timeLogsKeepTheirRates: true });

		fireEvent.click(screen.getByRole('radio', { name: /rates.APPLY_FROM_DAY/ }));
		fireEvent.change(screen.getByLabelText('rates.WEEKLY_LIMIT'), { target: { value: '20' } });
		await save();

		expect(onSaveRates).toHaveBeenCalledWith('row-ana', { reWeeklyLimit: 20 });
		expect(mockToastSuccess).not.toHaveBeenCalled();
	});
});

describe('the rate shown in a member row', () => {
	afterEach(() => {
		getDefaultStore().set(currentOrganizationState, null);
	});

	it('writes the currency sign on the side the workspace picked', () => {
		getDefaultStore().set(currentOrganizationState, { id: 'organization-1', currencyPosition: 'RIGHT' } as never);

		render(<MemberRateText rate={{ value: 40, currency: 'EUR', weeklyLimit: null } as never} />);

		expect(screen.getByText('rates.PER_HOUR 40.00 €')).toBeTruthy();
	});
});
