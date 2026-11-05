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
	useRateChangeRequest: () => ({ requestRateChange: jest.fn(), isSending: false })
}));

function payRateRead(overrides: Partial<PayRateRead>): PayRateRead {
	return { data: undefined, isError: false, isUnavailable: false, refetch: mockRefetch, ...overrides };
}

function renderSection() {
	render(<ProfileRatesSection employee={{ id: 'employee-ana', billRateValue: 80, billRateCurrency: 'USD' }} />);
}

beforeEach(() => {
	mockRefetch.mockReset();
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
