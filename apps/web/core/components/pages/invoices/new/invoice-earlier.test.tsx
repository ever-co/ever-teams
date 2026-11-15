/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';

type MockSectionProps = { title: string; children: React.ReactNode };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({
	DashboardSection: (props: MockSectionProps) => <section aria-label={props.title}>{props.children}</section>
}));

import { EarlierInvoices } from './invoice-earlier';

function invoiceWhoseEarlierRead(fields: Partial<NewInvoiceState>) {
	const invoice: Partial<NewInvoiceState> = {
		client: { id: 'client-acme', name: 'Acme' },
		earlierInvoices: [],
		overlappingInvoices: [],
		areEarlierLoading: false,
		haveEarlierFailed: false,
		refetchEarlier: jest.fn(),
		...fields
	};
	return invoice as NewInvoiceState;
}

describe('the invoices already saved for the client of a new invoice', () => {
	it('can be read again when they could not be read', () => {
		const refetchEarlier = jest.fn();
		render(<EarlierInvoices invoice={invoiceWhoseEarlierRead({ haveEarlierFailed: true, refetchEarlier })} />);

		expect(screen.getByRole('alert').textContent).toBe('invoices.new.earlier.ERROR');
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));

		expect(refetchEarlier).toHaveBeenCalledTimes(1);
	});

	it('offers no new read once they were read', () => {
		render(<EarlierInvoices invoice={invoiceWhoseEarlierRead({})} />);

		expect(screen.getByText('invoices.new.earlier.NONE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' })).toBeNull();
	});
});

describe('the earlier invoices of a client whose time the API records', () => {
	const october = { id: 'invoice-a', invoiceNumber: 41, terms: 'Billable time from 2026-10-01 to 2026-10-31' };
	const lateSeptember = { id: 'invoice-b', invoiceNumber: 40, terms: 'Billable time from 2026-09-15 to 2026-10-14' };

	function badgesOfRows() {
		return screen.getAllByRole('listitem').map((row) => row.querySelector('[data-slot="badge"]')?.className ?? '');
	}

	it('say the hours already on an invoice are left out of this one', () => {
		render(<EarlierInvoices invoice={invoiceWhoseEarlierRead({ recordsBilledTime: true })} />);

		expect(screen.getByText('invoices.billedTime.EARLIER_NOTE')).toBeTruthy();
		expect(screen.queryByText('invoices.new.earlier.NOTE')).toBeNull();
	});

	it('mark as a warning only the overlapping invoice whose hours may be billed twice', () => {
		const invoice = invoiceWhoseEarlierRead({
			recordsBilledTime: true,
			earlierInvoices: [october, lateSeptember],
			overlappingInvoices: [october, lateSeptember],
			overlapsAtRisk: ['invoice-b']
		});

		render(<EarlierInvoices invoice={invoice} />);

		const [octoberBadge, septemberBadge] = badgesOfRows();
		expect(octoberBadge).toContain('text-muted-foreground');
		expect(septemberBadge).toContain('text-warning-foreground');
	});

	it('keep the warning on every overlapping invoice when the API does not record billed time', () => {
		const invoice = invoiceWhoseEarlierRead({
			recordsBilledTime: false,
			earlierInvoices: [october],
			overlappingInvoices: [october],
			overlapsAtRisk: ['invoice-a']
		});

		render(<EarlierInvoices invoice={invoice} />);

		expect(screen.getByText('invoices.new.earlier.NOTE')).toBeTruthy();
		expect(badgesOfRows()[0]).toContain('text-warning-foreground');
	});
});
