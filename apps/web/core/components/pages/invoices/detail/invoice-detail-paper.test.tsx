/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/components/invoices/invoice-paper', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return {
		InvoicePaper: Pass,
		PaperHead: () => null,
		PaperLine: () => null,
		PaperLines: Pass,
		PaperNote: () => null,
		PaperParties: () => null,
		PaperTotals: ({ rows }: { rows: Array<{ key: string; label: string; value: string }> }) => (
			<dl>
				{rows.map((row) => (
					<div key={row.key}>
						<dt>{row.label}</dt>
						<dd>{row.value}</dd>
					</div>
				))}
			</dl>
		)
	};
});

import { InvoiceDetailPaper } from './invoice-detail-paper';

describe('InvoiceDetailPaper', () => {
	it('names no taxable base for a tax that spares a line, since only some of that base was taxed', () => {
		const invoice = {
			id: 'invoice-9',
			currency: 'USD',
			tax: 10,
			taxType: 'PERCENT',
			totalValue: 210,
			invoiceItems: [
				{ id: 'line-1', quantity: 1, price: 100, totalValue: 100, applyTax: true },
				{ id: 'line-2', quantity: 1, price: 100, totalValue: 100, applyTax: false }
			]
		} as TSavedInvoice;

		render(
			<InvoiceDetailPaper invoice={invoice} senderName="Studio" clientName="Acme" numberText="9" timeZone="UTC" />
		);

		expect(screen.queryByText(/invoices\.new\.adjustments\.TAX_ROW/)).toBeNull();
		expect(screen.getByText(/invoices\.detail\.TAX_PERCENT/)).toBeTruthy();
	});
});
