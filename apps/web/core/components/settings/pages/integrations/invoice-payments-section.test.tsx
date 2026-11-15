/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/services/client/api/organizations/invoice-payment-connection.service', () => ({
	invoicePaymentConnectionService: {
		getConnection: jest.fn(),
		connect: jest.fn(),
		rotateSecret: jest.fn()
	}
}));

import { invoicePaymentConnectionService } from '@/core/services/client/api/organizations/invoice-payment-connection.service';
import { InvoicePaymentsSection } from './invoice-payments-section';

const service = invoicePaymentConnectionService as jest.Mocked<typeof invoicePaymentConnectionService>;

function show() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<InvoicePaymentsSection />
		</QueryClientProvider>
	);
}

describe('InvoicePaymentsSection (ever-co/ever-gauzy#11856)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('offers to connect the payment connector where the API serves online payments', async () => {
		service.getConnection.mockResolvedValue({ connected: false, isEnabled: false, isTestMode: false });
		show();

		expect(await screen.findByText('invoices.payments.TITLE')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'invoices.payments.CONNECT' })).toBeTruthy();
	});

	it('shows the saved connection, never a signing secret', async () => {
		service.getConnection.mockResolvedValue({
			connected: true,
			isEnabled: true,
			isTestMode: true,
			checkoutEndpoint: 'https://connector.example.com/checkout',
			notificationUrl: 'https://api.example.test/api/public/invoice-payments/p1/notifications'
		});
		show();

		expect(await screen.findByDisplayValue('https://connector.example.com/checkout')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'invoices.payments.SAVE' })).toBeTruthy();
		expect(screen.queryByText('invoices.payments.SECRET')).toBeNull();
	});

	it('locks the form while a save is on its way, whose answer would drop an edit made meanwhile', async () => {
		service.getConnection.mockResolvedValue({ connected: false, isEnabled: false, isTestMode: false });
		service.connect.mockReturnValue(new Promise(() => undefined));
		show();

		const endpoint = await screen.findByPlaceholderText('https://');
		fireEvent.change(endpoint, { target: { value: 'https://connector.example.com/checkout' } });
		fireEvent.click(screen.getByRole('button', { name: 'invoices.payments.CONNECT' }));

		await waitFor(() => expect(service.connect).toHaveBeenCalled());
		expect(endpoint).toHaveProperty('disabled', true);
		expect(screen.getAllByRole('switch')).toHaveLength(2);
		for (const toggle of screen.getAllByRole('switch')) {
			expect(toggle).toHaveProperty('disabled', true);
		}
	});

	it.each([
		['a member the API does not let read the payment providers', 403],
		['an API that does not serve online invoice payments', 404]
	])('stays hidden for %s', async (_label, status) => {
		service.getConnection.mockRejectedValue({ response: { status }, status });
		const { container } = show();

		await waitFor(() => expect(container.innerHTML).toBe(''));
		expect(service.getConnection).toHaveBeenCalledTimes(1);
	});
});
