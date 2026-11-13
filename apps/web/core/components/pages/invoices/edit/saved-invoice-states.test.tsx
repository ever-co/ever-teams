/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SavedInvoice } from '@/core/lib/utils/invoice-edit';

type MockMessageProps = { title: string; message: string; action?: React.ReactNode };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/dashboards/kit/dashboard-states', () => ({ DashboardErrorNotice: () => null }));
jest.mock('../invoice-access-guard', () => ({ INVOICES_PATH: '/invoices' }));
jest.mock('../new/new-invoice-states', () => ({
	MessageLink: ({ children }: Readonly<{ children: React.ReactNode }>) => <a href="/invoices">{children}</a>,
	NewInvoiceMessage: ({ title, message, action }: MockMessageProps) => (
		<section>
			<h2>{title}</h2>
			<p>{message}</p>
			{action}
		</section>
	),
	NewInvoicePageSkeleton: () => null
}));

import { LockedInvoiceMessage } from './saved-invoice-states';

function savedWith(status: SavedInvoice['status']) {
	return { id: 'invoice-42', number: 42, status } as SavedInvoice;
}

describe('an invoice that can no longer be edited', () => {
	it('says what to do with an invoice something was paid on', () => {
		render(<LockedInvoiceMessage saved={savedWith('FULLY_PAID')} />);

		expect(screen.getByRole('heading').textContent).toBe('invoices.edit.LOCKED_TITLE');
		expect(screen.getByText('invoices.edit.LOCKED_PAID')).toBeTruthy();
	});

	it('says the changes were not saved when a save was refused as it was paid since the editor opened', () => {
		render(<LockedInvoiceMessage saved={savedWith('FULLY_PAID')} wasSaveRefused />);

		expect(screen.getByText('invoices.edit.confirm.LOCKED_NOW')).toBeTruthy();
		expect(screen.queryByText('invoices.edit.LOCKED_PAID')).toBeNull();
	});
});
