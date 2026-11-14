/** @jest-environment jsdom */

import React from 'react';
import { getDefaultStore } from 'jotai';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { MemberRateEditor, MemberRateText } from './member-rate-editor';

const mockUseGetCurrentOrganization = jest.fn();

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
