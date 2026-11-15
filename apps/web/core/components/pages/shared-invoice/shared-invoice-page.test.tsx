/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const search = new URLSearchParams();

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
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.c2lnbmF0dXJl';
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
			<SharedInvoicePage id={ID} token={TOKEN} />
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
			value: { ...window.location, href: `https://app.ever.team/shared-invoice/${ID}/${TOKEN}`, assign },
			writable: true
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
		search.delete('paid');
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
		expect(service.startCheckout).toHaveBeenCalledWith(
			ID,
			TOKEN,
			`https://app.ever.team/shared-invoice/${ID}/${TOKEN}?paid=1`
		);
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

	it('back from the provider, says the payment is being confirmed', async () => {
		search.set('paid', '1');
		show();

		expect(await screen.findByText('invoices.shared.RETURNED_TITLE')).toBeTruthy();
	});
});
