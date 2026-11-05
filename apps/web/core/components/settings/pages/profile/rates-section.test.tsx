/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileRatesSection } from './rates-section';

interface PayRateRead {
	data: unknown;
	isError: boolean;
	isUnavailable: boolean;
	refetch: jest.Mock;
}

const mockRefetch = jest.fn();
let mockPayRateRead: PayRateRead;
let mockPermissions: string[] = [];
const mockEditorProps = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) => {
		if (values?.amount) {
			return `${key} ${values.amount}`;
		}
		return key;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useEmployeePayRate: () => mockPayRateRead,
	useRateChangeRequest: () => ({ requestRateChange: jest.fn(), isSending: false }),
	useOwnRatesMutation: () => ({ saveOwnRates: jest.fn() })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));
jest.mock('../members/member-rate-editor', () => ({
	MemberRateEditor: (props: { editsPayRate: boolean }) => {
		mockEditorProps(props);
		return <li>rate editor</li>;
	}
}));

function payRateRead(overrides: Partial<PayRateRead>): PayRateRead {
	return { data: undefined, isError: false, isUnavailable: false, refetch: mockRefetch, ...overrides };
}

function renderSection() {
	render(
		<ProfileRatesSection
			employee={{ id: 'employee-ana', billRateValue: 80, billRateCurrency: 'USD' }}
			name="Ana Lima"
			imageUrl={null}
		/>
	);
}

beforeEach(() => {
	mockRefetch.mockReset();
	mockEditorProps.mockReset();
	mockPermissions = [];
	mockPayRateRead = payRateRead({});
});

it('shows the pay rate next to the billing rate, in the currency Gauzy states', () => {
	mockPayRateRead = payRateRead({
		data: { employeeId: 'employee-ana', payRateValue: 30, payRateCurrency: null, currency: 'EUR' }
	});
	renderSection();

	expect(screen.getByText('rates.BILLING_RATE')).toBeTruthy();
	expect(screen.getByText('rates.PAY_RATE')).toBeTruthy();
	expect(screen.getByText('rates.PER_HOUR €30.00')).toBeTruthy();
});

it('says the pay rate is not set when Gauzy has none', () => {
	mockPayRateRead = payRateRead({
		data: { employeeId: 'employee-ana', payRateValue: null, payRateCurrency: null, currency: 'EUR' }
	});
	renderSection();

	expect(screen.getByText('rates.PAY_RATE')).toBeTruthy();
	expect(screen.getAllByText('rates.NOT_SET').length).toBeGreaterThan(0);
});

it('stays quiet when Gauzy has no pay rate route or refuses the read (404 or 403)', () => {
	mockPayRateRead = payRateRead({ isError: true, isUnavailable: true });
	renderSection();

	expect(screen.queryByText('rates.PAY_RATE')).toBeNull();
	expect(screen.queryByText('notifications.RETRY')).toBeNull();
});

it('offers a retry when the read fails for another reason', () => {
	mockPayRateRead = payRateRead({ isError: true });
	renderSection();

	fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));

	expect(mockRefetch).toHaveBeenCalledTimes(1);
});

describe("changing one's own rates", () => {
	it('keeps the rates read only with the request form without CHANGE_OWN_RATES', () => {
		mockPermissions = ['ORG_EMPLOYEES_EDIT'];
		renderSection();

		expect(screen.getByText('rates.OWN_SECTION_HINT')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'rates.REQUEST_CHANGE_ACTION' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'rates.EDIT_RATE' })).toBeNull();
	});

	it('lets a CHANGE_OWN_RATES holder edit them, the pay rate too with ORG_EMPLOYEES_EDIT', () => {
		mockPermissions = ['CHANGE_OWN_RATES', 'ORG_EMPLOYEES_EDIT'];
		renderSection();

		expect(screen.getByText('rates.OWN_SECTION_EDIT_HINT')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'rates.REQUEST_CHANGE_ACTION' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'rates.EDIT_RATE' }));

		expect(screen.getByText('rate editor')).toBeTruthy();
		expect(mockEditorProps).toHaveBeenCalledWith(expect.objectContaining({ editsPayRate: true }));
	});

	it('leaves the pay rate out of the edit without ORG_EMPLOYEES_EDIT, the only route that takes it', () => {
		mockPermissions = ['CHANGE_OWN_RATES'];
		renderSection();

		fireEvent.click(screen.getByRole('button', { name: 'rates.EDIT_RATE' }));

		expect(mockEditorProps).toHaveBeenCalledWith(expect.objectContaining({ editsPayRate: false }));
	});
});
