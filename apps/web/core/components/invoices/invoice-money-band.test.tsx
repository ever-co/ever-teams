/** @jest-environment jsdom */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { InvoiceStandingSummary } from '@/core/lib/utils/invoice-standing';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('./money-figure', () => ({
	MoneyFigure: ({ amount, currency }: { amount: number; currency: string | null }) => (
		<span data-testid="money">{`${amount} ${currency}`}</span>
	)
}));

import { InvoiceMoneyBand } from './invoice-money-band';

const NO_COUNTS = { draft: 0, open: 0, overdue: 0, paid: 0, void: 0 } as InvoiceStandingSummary['counts'];

function summaryOf(parts: Partial<InvoiceStandingSummary>): InvoiceStandingSummary {
	return {
		counts: NO_COUNTS,
		owed: [],
		overdue: [],
		paid: [],
		billed: [],
		owedWithoutAmount: 0,
		lastIssuedDay: null,
		...parts
	};
}

function figureOf(label: string) {
	const legend = screen.getByText(label);
	const button = legend.closest('button');
	if (!button) {
		throw new Error(`no figure for ${label}`);
	}
	return button;
}

describe('InvoiceMoneyBand', () => {
	it('shows no amount when no owed invoice states its balance', () => {
		const summary = summaryOf({ counts: { ...NO_COUNTS, open: 2 }, owedWithoutAmount: 2 });

		render(<InvoiceMoneyBand summary={summary} picked="all" onPick={jest.fn()} />);

		expect(screen.queryAllByTestId('money')).toHaveLength(0);
		expect(screen.getByText('invoices.money.INVOICE_COUNT {"count":2}')).toBeTruthy();
	});

	it('counts the invoices of the currency its amounts are in', () => {
		const summary = summaryOf({
			counts: { ...NO_COUNTS, open: 1, overdue: 1 },
			owed: [
				{ currency: 'USD', amount: 1000, count: 1 },
				{ currency: 'EUR', amount: 900, count: 1 }
			],
			overdue: [{ currency: 'EUR', amount: 900, count: 1 }]
		});

		render(<InvoiceMoneyBand summary={summary} picked="all" onPick={jest.fn()} />);

		const overdue = figureOf('invoices.money.OVERDUE');
		expect(within(overdue).getByTestId('money').textContent).toBe('0 USD');
		expect(within(overdue).getByText('0')).toBeTruthy();
		expect(within(figureOf('invoices.money.NOT_YET_DUE')).getByText('1')).toBeTruthy();
		expect(screen.getByText('invoices.money.INVOICE_COUNT {"count":1}')).toBeTruthy();
	});
});
