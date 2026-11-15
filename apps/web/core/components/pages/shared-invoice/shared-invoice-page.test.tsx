/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const search = new URLSearchParams();
const mockLink = { current: undefined as { id: string; token: string } | null | undefined };
const mockKeepLinkWhilePaying = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => search }));
jest.mock('@/core/components/pages/invoices/detail/invoice-detail-skeleton', () => ({
	InvoiceDetailHeaderSkeleton: () => null,
	InvoiceDetailBodySkeleton: () => null
}));
jest.mock('@/core/components/pages/invoices/detail/invoice-detail-paper', () => ({
	InvoiceDetailPaper: () => <div data-testid="paper" />
}));
jest.mock('@/core/components/invoices/invoice-standing', () => ({
	InvoiceStandingLabel: () => <span data-testid="standing" />
}));
jest.mock('@/core/hooks/invoices/use-shared-invoice-link', () => ({
	useSharedInvoiceLink: () => mockLink.current,
	keepLinkWhilePaying: (...args: unknown[]) => mockKeepLinkWhilePaying(...args)
}));
jest.mock('@/core/services/client/api/public/shared-invoice.service', () => ({
	sharedInvoiceService: {
		getSharedInvoice: jest.fn(),
		getPayOption: jest.fn(),
		startCheckout: jest.fn(),
		downloadSharedInvoicePdf: jest.fn()
	}
}));

import { sharedInvoiceService } from '@/core/services/client/api/public/shared-invoice.service';
import { SharedInvoicePage } from './shared-invoice-page';

const service = sharedInvoiceService as jest.Mocked<typeof sharedInvoiceService>;
const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const TOKEN = 'test-header.test-payload.test-signature';
const INVOICE = {
	id: ID,
	invoiceNumber: 42,
	status: 'SENT',
	currency: 'EUR',
	totalValue: 120.5,
	fromOrganization: { name: 'Ever Co.', officialName: null },
	toContact: { id: 'c1', name: 'Acme' }
};

function show() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<SharedInvoicePage />
		</QueryClientProvider>
	);
}

describe('SharedInvoicePage (ever-co/ever-gauzy#11856)', () => {
	const assign = jest.fn();

	beforeAll(() => {
		// The notices' orb asks for the reduced-motion preference, which jsdom does not answer
		window.matchMedia = jest.fn(() => ({
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		})) as never;
		Object.defineProperty(window, 'location', {
			value: { ...window.location, href: `https://app.ever.team/shared-invoice#id=${ID}&token=${TOKEN}`, assign },
			writable: true
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
		search.delete('paid');
		mockLink.current = { id: ID, token: TOKEN };
		service.getSharedInvoice.mockResolvedValue(INVOICE as never);
		service.getPayOption.mockResolvedValue({ payable: true, amountDue: 120.5, currency: 'EUR' });
	});

	it('shows the invoice with Pay for what is due, and sends the client to the checkout', async () => {
		service.startCheckout.mockResolvedValue('https://pay.example.com/c/abc');
		show();

		const pay = await screen.findByRole('button', { name: /invoices\.shared\.PAY/ });
		expect(screen.getByTestId('paper')).toBeTruthy();
		expect(screen.getByText(/invoices\.shared\.FROM_SENDER.*Ever Co\./)).toBeTruthy();

		fireEvent.click(pay);

		await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example.com/c/abc'));
		// The provider is given the page to come back to without the link: the tab keeps it while the client pays
		expect(service.startCheckout).toHaveBeenCalledWith(ID, TOKEN, 'https://app.ever.team/shared-invoice?paid=1');
		expect(mockKeepLinkWhilePaying).toHaveBeenCalledWith(ID, TOKEN);
	});

	it('offers no Pay when the workspace takes no online payment', async () => {
		service.getPayOption.mockResolvedValue({ payable: false, amountDue: 120.5, currency: 'EUR' });
		show();

		await screen.findByTestId('paper');
		await waitFor(() => expect(service.getPayOption).toHaveBeenCalled());
		expect(screen.queryByRole('button', { name: /invoices\.shared\.PAY/ })).toBeNull();
		expect(screen.getByRole('button', { name: 'invoices.actions.DOWNLOAD' })).toBeTruthy();
	});

	it('says the payment failed to start, and stays on the page', async () => {
		service.startCheckout.mockRejectedValue(new Error('502'));
		show();

		fireEvent.click(await screen.findByRole('button', { name: /invoices\.shared\.PAY/ }));

		expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'invoices.shared.PAY_FAILED');
		expect(assign).not.toHaveBeenCalled();
	});

	it('says a revoked or voided link no longer opens the invoice, with nothing to retry', async () => {
		service.getSharedInvoice.mockRejectedValue({ response: { status: 403 }, status: 403 });
		show();

		expect(await screen.findByText('invoices.shared.CLOSED_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('says the invoice is paid, and offers no Pay', async () => {
		service.getSharedInvoice.mockResolvedValue({ ...INVOICE, status: 'FULLY_PAID' } as never);
		show();

		expect(await screen.findByText('invoices.shared.PAID_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /invoices\.shared\.PAY/ })).toBeNull();
	});

	it('back from the provider, says the payment is being confirmed, and offers no second Pay', async () => {
		search.set('paid', '1');
		show();

		expect(await screen.findByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();
		await waitFor(() => expect(service.getPayOption).toHaveBeenCalled());
		expect(screen.queryByRole('button', { name: /invoices\.shared\.PAY/ })).toBeNull();
	});

	it('back from the provider, offers Pay again once the first two minutes are over (a cancelled payment)', async () => {
		jest.useFakeTimers();
		try {
			search.set('paid', '1');
			show();
			expect(await screen.findByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();
			expect(screen.queryByRole('button', { name: /invoices\.shared\.PAY/ })).toBeNull();

			await act(async () => {
				jest.advanceTimersByTime(2 * 60_000 + 1_000);
			});

			expect(await screen.findByRole('button', { name: /invoices\.shared\.PAY/ })).toBeTruthy();
		} finally {
			jest.useRealTimers();
		}
	});

	it('back from the provider, says no payment failed to start while the payment just made is confirmed', async () => {
		jest.useFakeTimers();
		try {
			search.set('paid', '1');
			service.getPayOption.mockRejectedValue({ response: { status: 502 }, status: 502 });
			show();
			expect(await screen.findByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();
			await act(async () => {
				jest.advanceTimersByTime(1_000);
			});

			expect(service.getPayOption).toHaveBeenCalled();
			expect(screen.queryByRole('alert')).toBeNull();
			expect(screen.queryByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' })).toBeNull();

			await act(async () => {
				jest.advanceTimersByTime(2 * 60_000 + 1_000);
			});

			expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'invoices.shared.PAY_FAILED');
		} finally {
			jest.useRealTimers();
		}
	});

	it('back from the provider, stops reading a link the API closed meanwhile', async () => {
		jest.useFakeTimers();
		try {
			search.set('paid', '1');
			service.getSharedInvoice.mockRejectedValue({ response: { status: 403 }, status: 403 });
			show();

			expect(await screen.findByText('invoices.shared.CLOSED_TITLE')).toBeTruthy();
			await act(async () => {
				jest.advanceTimersByTime(30_000);
			});

			expect(service.getSharedInvoice).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
		}
	});

	it('back from the provider, still shows paid a confirmation that comes after the first two minutes', async () => {
		jest.useFakeTimers();
		try {
			search.set('paid', '1');
			show();
			expect(await screen.findByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();

			await act(async () => {
				jest.advanceTimersByTime(2 * 60_000 + 5_000);
			});
			service.getSharedInvoice.mockResolvedValue({ ...INVOICE, status: 'FULLY_PAID' } as never);
			await act(async () => {
				jest.advanceTimersByTime(35_000);
			});

			expect(await screen.findByText('invoices.shared.PAID_TITLE')).toBeTruthy();
			expect(screen.queryByText('invoices.shared.RETURNED_TITLE')).toBeNull();
		} finally {
			jest.useRealTimers();
		}
	});

	it('says whether Pay is offered could not be read, and reads it again on request', async () => {
		service.getPayOption.mockRejectedValueOnce({ response: { status: 502 }, status: 502 });
		show();

		expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'invoices.shared.PAY_FAILED');
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));

		expect(await screen.findByRole('button', { name: /invoices\.shared\.PAY/ })).toBeTruthy();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('offers no Pay and says nothing failed where the API does not serve online payments', async () => {
		service.getPayOption.mockRejectedValue({ response: { status: 404 }, status: 404 });
		show();

		await screen.findByTestId('paper');
		await waitFor(() => expect(service.getPayOption).toHaveBeenCalled());
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.queryByRole('button', { name: /invoices\.shared\.PAY/ })).toBeNull();
	});

	it('says an address without a link opens nothing, and asks nothing of the API', () => {
		mockLink.current = null;
		show();

		expect(screen.getByText('invoices.shared.CLOSED_TITLE')).toBeTruthy();
		expect(service.getSharedInvoice).not.toHaveBeenCalled();
	});

	it('back from the provider in a tab that kept no link, still says the payment is being confirmed', () => {
		mockLink.current = null;
		search.set('paid', '1');
		show();

		expect(screen.getByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();
		expect(service.getSharedInvoice).not.toHaveBeenCalled();
	});

	it('waits for the browser to read the link before asking the API', () => {
		mockLink.current = undefined;
		show();

		expect(screen.getByLabelText('common.LOADING')).toBeTruthy();
		expect(service.getSharedInvoice).not.toHaveBeenCalled();
	});
});
