/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

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

const mockRetry = jest.fn();

interface MockSaveDialogProps {
	open: boolean;
	onClose: () => void;
	onSaveFailed?: () => void;
	onChangedMeanwhile?: () => void;
}

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
	useSavedInvoice: () => ({ ...mockRead.current, retry: mockRetry })
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
	RevisedInvoiceBody: ({
		invoice,
		renderSaveDialog
	}: Readonly<{
		invoice: { opened: MockSaved };
		renderSaveDialog: (dialog: { open: boolean; onClose: () => void }) => React.ReactNode;
	}>) => (
		<>
			<p>editor of the {invoice.opened.version} invoice</p>
			{renderSaveDialog({ open: true, onClose: () => undefined })}
		</>
	)
}));
// The save dialog's answers, as buttons: a save refused as changed meanwhile, another failed save, and closing it
jest.mock('./save-invoice-changes-dialog', () => ({
	SaveInvoiceChangesDialog: ({ onClose, onSaveFailed, onChangedMeanwhile }: MockSaveDialogProps) => (
		<>
			<button
				type="button"
				onClick={() => {
					onSaveFailed?.();
					onChangedMeanwhile?.();
				}}
			>
				refused as changed meanwhile
			</button>
			<button type="button" onClick={() => onSaveFailed?.()}>
				not saved
			</button>
			<button type="button" onClick={onClose}>
				close
			</button>
		</>
	)
}));
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

describe('the invoice editor after a save refused because the invoice changed meanwhile (#5243)', () => {
	let now = 1_000;

	beforeEach(() => {
		now = 1_000;
		jest.spyOn(Date, 'now').mockImplementation(() => now);
		mockRetry.mockReset();
	});

	afterEach(() => jest.restoreAllMocks());

	function readAt(version: string, readAtTime: number, hasReadFailed = false): MockRead {
		const saved = { id: 'inv-42', number: 42, status: 'SENT', version };
		return { status: 'ready', saved, isRefreshing: false, readAt: readAtTime, hasReadFailed, number: 42 };
	}

	function refuseAsChangedMeanwhileAndClose() {
		fireEvent.click(screen.getByRole('button', { name: 'refused as changed meanwhile' }));
		now = 2_000;
		fireEvent.click(screen.getByRole('button', { name: 'close' }));
	}

	it('reads the invoice again once the dialog is closed, and opens on what it holds now', () => {
		mockRead.current = readAt('opened', 1_000);
		const { rerender } = render(<EditInvoicePage />);
		expect(screen.getByText('editor of the opened invoice')).toBeTruthy();

		refuseAsChangedMeanwhileAndClose();

		expect(mockRetry).toHaveBeenCalledTimes(1);
		// The edit made on the earlier version is not offered again while the current one is read
		expect(screen.getByText('skeleton')).toBeTruthy();
		mockRead.current = readAt('current', 3_000);
		rerender(<EditInvoicePage />);
		expect(screen.getByText('editor of the current invoice')).toBeTruthy();
	});

	it('offers to read again when that read fails', () => {
		mockRead.current = readAt('opened', 1_000);
		const { rerender } = render(<EditInvoicePage />);

		refuseAsChangedMeanwhileAndClose();
		mockRead.current = readAt('opened', 1_000, true);
		rerender(<EditInvoicePage />);

		expect(screen.getByText('message')).toBeTruthy();
		expect(screen.queryByText(/editor of/)).toBeNull();
	});

	it('keeps the editor on its invoice after any other failed save, as before', () => {
		mockRead.current = readAt('opened', 1_000);
		const { rerender } = render(<EditInvoicePage />);

		fireEvent.click(screen.getByRole('button', { name: 'not saved' }));
		now = 2_000;
		fireEvent.click(screen.getByRole('button', { name: 'close' }));
		mockRead.current = readAt('current', 3_000);
		rerender(<EditInvoicePage />);

		expect(mockRetry).toHaveBeenCalledTimes(1);
		expect(screen.getByText('editor of the opened invoice')).toBeTruthy();
	});
});
