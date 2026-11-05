/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RateChangeRequestForm } from './rate-change-request-form';

const mockRequestRateChange = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useRateChangeRequest: () => ({ requestRateChange: mockRequestRateChange, isSending: false })
}));

function renderForm(onClose = jest.fn()) {
	render(<RateChangeRequestForm currentCurrency="EUR" onClose={onClose} />);
	return { onClose };
}

async function send(rate: string, reason = '') {
	fireEvent.change(screen.getByLabelText('rates.REQUESTED_RATE'), { target: { value: rate } });
	fireEvent.change(screen.getByLabelText('rates.REQUEST_REASON'), { target: { value: reason } });
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'rates.REQUEST_SEND' }));
	});
}

beforeEach(() => {
	mockRequestRateChange.mockReset();
});

it('sends the requested rate in the chosen currency with the reason, and says the admins were notified', async () => {
	mockRequestRateChange.mockResolvedValue({ notified: 2 });
	renderForm();

	await send('55,5', '  New certification  ');

	expect(mockRequestRateChange).toHaveBeenCalledWith({
		billRateValue: 55.5,
		billRateCurrency: 'EUR',
		reason: 'New certification'
	});
	expect(screen.getByRole('status').textContent).toBe('rates.REQUEST_SENT');
});

it('says so when the organization has no admin to notify', async () => {
	mockRequestRateChange.mockResolvedValue({ notified: 0 });
	renderForm();

	await send('55');

	expect(screen.getByRole('status').textContent).toBe('rates.REQUEST_NOBODY');
});

it('tells the employee to ask directly when the server has no rate change requests yet (404)', async () => {
	mockRequestRateChange.mockRejectedValue({ response: { status: 404 } });
	renderForm();

	await send('55');

	expect(screen.getByRole('alert').textContent).toBe('rates.REQUEST_UNAVAILABLE');
	expect(screen.getByRole('button', { name: 'rates.REQUEST_SEND' })).toBeTruthy();
});

it('keeps the form with the reason when Gauzy refuses the request', async () => {
	mockRequestRateChange.mockRejectedValue({ response: { status: 403 } });
	renderForm();

	await send('55');

	expect(screen.getByRole('alert').textContent).toBe('rates.REQUEST_FAILED toasts.REASONS.PERMISSION');
});

it('asks for a valid rate before sending anything', async () => {
	renderForm();

	await send('');
	expect(screen.getByRole('alert').textContent).toBe('rates.REQUESTED_RATE_REQUIRED');

	await send('a lot');
	expect(screen.getByRole('alert').textContent).toBe('rates.NUMBER_INVALID');

	await send('-4');
	expect(screen.getByRole('alert').textContent).toBe('rates.NUMBER_NEGATIVE');

	expect(mockRequestRateChange).not.toHaveBeenCalled();
});

it('closes from the confirmation', async () => {
	mockRequestRateChange.mockResolvedValue({ notified: 1 });
	const { onClose } = renderForm();

	await send('55');
	fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));

	expect(onClose).toHaveBeenCalledTimes(1);
});
