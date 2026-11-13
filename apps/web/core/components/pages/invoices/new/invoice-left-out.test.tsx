/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InvoiceCurrencyTotal } from '@/core/lib/utils/invoices';

type MockSectionProps = { title: string; children: React.ReactNode };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({
	DashboardSection: (props: MockSectionProps) => <section aria-label={props.title}>{props.children}</section>
}));

import { OtherCurrencies } from './invoice-left-out';

function totalIn(currency: string | null, amount: number): InvoiceCurrencyTotal {
	return {
		key: currency ?? '',
		currency,
		amount,
		seconds: 7200,
		memberCount: 1,
		hours: 2,
		lineCount: 1
	};
}

describe('the time priced in another currency than the invoice', () => {
	it('offers to invoice a currency instead, but never time that has no currency', () => {
		const onInvoice = jest.fn();
		const euros = totalIn('EUR', 160);
		const withoutCurrency = totalIn(null, 90);

		render(<OtherCurrencies currencies={[euros, withoutCurrency]} onInvoice={onInvoice} />);

		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		expect(screen.getByText('invoices.new.NO_CURRENCY')).toBeTruthy();
		const switches = screen.getAllByRole('button');
		expect(switches).toHaveLength(1);
		fireEvent.click(switches[0]);
		expect(onInvoice).toHaveBeenCalledWith('EUR');
	});
});
