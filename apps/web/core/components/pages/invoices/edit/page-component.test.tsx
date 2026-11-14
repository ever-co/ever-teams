/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

interface MockSaved {
	id: string;
	number: number;
	status: string;
	version: string;
}

interface MockRead {
	status: string;
	saved: MockSaved | null;
	isRefreshing: boolean;
	readAt: number;
	hasReadFailed: boolean;
	number: number;
}

const mockRead: { current: MockRead } = {
	current: { status: 'loading', saved: null, isRefreshing: false, readAt: 0, hasReadFailed: false, number: 42 }
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

/** Read during this visit, or kept from an earlier one (read at 1). */
function readOf(version: string, isRefreshing: boolean, { isKept = false, hasReadFailed = false } = {}): MockRead {
	const saved = { id: 'inv-42', number: 42, status: 'SENT', version };
	const readAt = isKept ? 1 : Date.now() + 60_000;
	return { status: 'ready', saved, isRefreshing, readAt, hasReadFailed, number: 42 };
}

describe('the invoice editor', () => {
	it('opens on this visit’s read, never on details kept from an earlier visit', () => {
		// Kept from an earlier visit, the details show at once while the invoice is read again
		mockRead.current = readOf('cached', true, { isKept: true });
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

	it('offers to read again, instead of opening the kept details, when this visit’s read failed', () => {
		mockRead.current = readOf('cached', false, { isKept: true, hasReadFailed: true });

		render(<EditInvoicePage />);

		expect(screen.getByText('message')).toBeTruthy();
		expect(screen.queryByText(/editor of/)).toBeNull();
	});

	it('keeps the kept details closed while it waits for the connection to read', () => {
		mockRead.current = readOf('cached', false, { isKept: true });

		render(<EditInvoicePage />);

		expect(screen.getByText('skeleton')).toBeTruthy();
		expect(screen.queryByText(/editor of/)).toBeNull();
	});
});
