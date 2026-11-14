/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

interface MockSaved {
	id: string;
	number: number;
	status: string;
	version: string;
}

const mockRead: { current: { status: string; saved: MockSaved | null; isRefreshing: boolean; number: number } } = {
	current: { status: 'loading', saved: null, isRefreshing: false, number: 42 }
};

jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'inv-42' }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (Component: React.ComponentType) => Component
}));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({ DashboardToolbar: () => null }));
// Like the real editor, it keeps the invoice it opens on
jest.mock('@/core/hooks/invoices/use-invoice-edit', () => ({
	useInvoiceEdit: (saved: MockSaved) => {
		const [opened] = jest.requireActual('react').useState(saved);
		return { opened, period: null, time: { isUpdating: false } };
	}
}));
jest.mock('@/core/hooks/invoices/use-saved-invoice', () => ({
	useSavedInvoice: () => ({ ...mockRead.current, retry: jest.fn() })
}));
jest.mock('@/core/lib/utils/dashboard-period', () => ({ formatPeriod: () => '' }));
jest.mock('../invoice-access-guard', () => ({
	editInvoicePathOf: (id: string) => `/invoices/${id}/edit`,
	InvoiceAccessGuard: ({ children }: Readonly<{ children: React.ReactNode }>) => <>{children}</>
}));
jest.mock('../new/invoice-screen', () => ({
	CancelInvoiceLink: () => null,
	TakeTimeAgainButton: () => null,
	InvoiceScreenFrame: ({ children }: Readonly<{ children?: React.ReactNode }>) => <>{children}</>,
	RevisedInvoiceBody: ({ invoice }: Readonly<{ invoice: { opened: MockSaved } }>) => (
		<p>editor of the {invoice.opened.version} invoice</p>
	)
}));
jest.mock('./save-invoice-changes-dialog', () => ({ SaveInvoiceChangesDialog: () => null }));
jest.mock('./saved-invoice-states', () => ({
	EditInvoicePageSkeleton: () => <p>skeleton</p>,
	LockedInvoiceMessage: () => <p>locked</p>,
	SavedInvoiceMessage: () => <p>message</p>
}));

import EditInvoicePage from './page-component';

function readOf(version: string, isRefreshing: boolean) {
	const saved = { id: 'inv-42', number: 42, status: 'SENT', version };
	return { status: 'ready', saved, isRefreshing, number: 42 };
}

describe('the invoice editor', () => {
	it('opens on this visit’s read, never on details kept from an earlier visit', () => {
		// Kept from an earlier visit, the details show at once while the invoice is read again
		mockRead.current = readOf('cached', true);
		const { rerender } = render(<EditInvoicePage />);

		expect(screen.getByText('skeleton')).toBeTruthy();
		expect(screen.queryByText(/editor of/)).toBeNull();

		mockRead.current = readOf('fresh', false);
		rerender(<EditInvoicePage />);

		expect(screen.getByText('editor of the fresh invoice')).toBeTruthy();
	});

	it('stays open on its invoice through a later read', () => {
		mockRead.current = readOf('fresh', false);
		const { rerender } = render(<EditInvoicePage />);

		mockRead.current = readOf('refreshed', true);
		rerender(<EditInvoicePage />);

		expect(screen.queryByText('skeleton')).toBeNull();
		expect(screen.getByText('editor of the fresh invoice')).toBeTruthy();
	});
});
