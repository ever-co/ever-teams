/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { invoiceDayOf, invoiceDayTextOf, invoicePeriodTextOf, invoiceTermsOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/components/icons', () => ({ Download: () => null, Loader: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));

import { InvoicesLedger } from './invoices-ledger';

const october = { fromDay: '2026-10-01', toDay: '2026-10-31' };

const invoice = {
	id: 'invoice-42',
	invoiceNumber: 42,
	invoiceDate: '2026-11-12T00:00:00.000Z',
	dueDate: '2026-12-12T23:59:59.999Z',
	terms: invoiceTermsOf(october),
	status: 'DRAFT',
	totalValue: 800,
	currency: 'USD',
	toContactId: 'client-acme',
	toContact: { id: 'client-acme', name: 'Acme' }
} as TInvoice;

function hasClassUp(element: HTMLElement, className: string) {
	let current: HTMLElement | null = element;
	while (current) {
		if (current.classList.contains(className)) {
			return true;
		}
		current = current.parentElement;
	}
	return false;
}

/** The elements that state a text, by the widths they show at: below `lg`, and from `lg` on. */
function shownAtEachWidth(text: string) {
	// The page's text is matched with its spaces collapsed, the thin spaces of a formatted date among them
	const collapsed = text.replace(/\s+/g, ' ');
	const stating = screen.getAllByText(collapsed, { exact: false });
	const belowLarge = stating.filter((element) => !hasClassUp(element, 'max-lg:hidden'));
	const fromLarge = stating.filter((element) => !hasClassUp(element, 'lg:hidden'));
	return { belowLarge, fromLarge };
}

describe('a row of the invoices list', () => {
	it('states the period and the due date at every width, a phone included', () => {
		render(
			<InvoicesLedger
				invoices={[invoice]}
				clientNames={new Map()}
				timeZone="UTC"
				pendingPdfId={null}
				onDownload={jest.fn()}
				canEdit={false}
				changingId={null}
				onAction={jest.fn()}
			/>
		);
		const periodText = invoicePeriodTextOf(october, 'en') ?? '';
		const dueText = invoiceDayTextOf(invoiceDayOf(invoice.dueDate, 'UTC'), 'en') ?? '';

		const period = shownAtEachWidth(periodText);
		const due = shownAtEachWidth(dueText);

		expect(period.belowLarge.length).toBeGreaterThan(0);
		expect(period.fromLarge.length).toBeGreaterThan(0);
		expect(due.belowLarge.length).toBeGreaterThan(0);
		expect(due.fromLarge.length).toBeGreaterThan(0);
	});
});
