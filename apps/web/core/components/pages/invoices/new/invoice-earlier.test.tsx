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
