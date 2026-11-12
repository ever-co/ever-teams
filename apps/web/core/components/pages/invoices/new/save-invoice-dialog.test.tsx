/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	onClose: () => void;
	confirmLabel: string;
	onConfirm: () => void;
	extra?: React.ReactNode;
	secondaryAction?: { label: string; onClick: () => void };
};

const mockPush = jest.fn();
const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToast.success(...args),
		warning: (...args: unknown[]) => mockToast.warning(...args),
		error: (...args: unknown[]) => mockToast.error(...args)
	}
}));
jest.mock('@/core/components/icons', () => ({
	Building: () => null,
	Calendar: () => null,
	Clock: () => null,
	FileText: () => null,
	Invoice: () => null,
	Mail: () => null
}));
jest.mock('../invoice-access-guard', () => ({ INVOICES_PATH: '/invoices' }));
// The header's close button and Escape both end in `onClose`; "leave" stands for them
jest.mock('@/core/components/projects/dialogs/project-confirm-dialog', () => ({
	ProjectConfirmDialog: (props: MockConfirmDialogProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={props.title}>
				<button type="button" onClick={props.onClose}>
					leave
				</button>
				{props.extra}
				{props.secondaryAction && (
					<button type="button" onClick={props.secondaryAction.onClick}>
						{props.secondaryAction.label}
					</button>
				)}
				<button type="button" onClick={props.onConfirm}>
					{props.confirmLabel}
				</button>
			</div>
		);
	}
}));

import { SaveInvoiceDialog } from './save-invoice-dialog';

interface InvoiceOptions {
	isSaving?: boolean;
	primaryEmail?: string | null;
	saveAndSend?: jest.Mock;
}

function invoiceOf({ isSaving = false, primaryEmail = null, saveAndSend = jest.fn() }: InvoiceOptions = {}) {
	const invoice: Partial<NewInvoiceState> = {
		numberText: '42',
		client: { id: 'client-acme', name: 'Acme', primaryEmail },
		periodDays: { fromDay: '2026-10-01', toDay: '2026-10-31' },
		keptLines: [],
		keptHours: 0,
		total: 0,
		currency: 'USD',
		issueDay: '2026-11-12',
		dueDay: '2026-12-11',
		isSaving,
		save: jest.fn(),
		saveAndSend
	};
	return invoice as NewInvoiceState;
}

beforeEach(() => {
	mockPush.mockReset();
	mockToast.success.mockReset();
	mockToast.warning.mockReset();
	mockToast.error.mockReset();
});

describe('leaving the confirmation of a new invoice', () => {
	it('keeps the dialog while the invoice is being saved', () => {
		const onClose = jest.fn();
		render(<SaveInvoiceDialog open invoice={invoiceOf({ isSaving: true })} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes the dialog when nothing is being saved', () => {
		const onClose = jest.fn();
		render(<SaveInvoiceDialog open invoice={invoiceOf({ isSaving: false })} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

describe('saving a new invoice and sending it', () => {
	it('offers to save only when the client has no e-mail', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf()} onClose={jest.fn()} />);

		expect(screen.getByRole('button', { name: 'invoices.new.SAVE' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' })).toBeNull();
	});

	it('offers Save and send beside Save invoice, the client’s address shown and editable', () => {
		render(
			<SaveInvoiceDialog open invoice={invoiceOf({ primaryEmail: 'billing@acme.test' })} onClose={jest.fn()} />
		);

		const recipient = screen.getByLabelText('invoices.send.RECIPIENT') as HTMLInputElement;

		expect(recipient.value).toBe('billing@acme.test');
		expect(screen.getByRole('button', { name: 'invoices.new.SAVE' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' })).toBeTruthy();
	});

	it('saves and sends once to the address shown, however many clicks come while it runs', async () => {
		const saveAndSend = jest.fn().mockResolvedValue({ invoice: { id: 'inv-42' }, outcome: 'sent' });
		const invoice = invoiceOf({ primaryEmail: 'billing@acme.test', saveAndSend });
		render(<SaveInvoiceDialog open invoice={invoice} onClose={jest.fn()} />);
		fireEvent.change(screen.getByLabelText('invoices.send.RECIPIENT'), { target: { value: 'ap@acme.test' } });

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' }));
			fireEvent.click(screen.getByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' }));
		});

		expect(saveAndSend).toHaveBeenCalledTimes(1);
		expect(saveAndSend).toHaveBeenCalledWith('ap@acme.test');
		expect(mockToast.success).toHaveBeenCalledWith('invoices.send.SENT');
		expect(mockPush).toHaveBeenCalledWith('/invoices');
	});

	it('says plainly that a saved invoice was not sent, and goes back to the list it can be sent from', async () => {
		const saveAndSend = jest.fn().mockResolvedValue({ invoice: { id: 'inv-42' }, outcome: 'notSent' });
		render(
			<SaveInvoiceDialog
				open
				invoice={invoiceOf({ primaryEmail: 'billing@acme.test', saveAndSend })}
				onClose={jest.fn()}
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' }));
		});

		expect(mockToast.error).toHaveBeenCalledTimes(1);
		expect(mockToast.error.mock.calls[0][0]).toBe('invoices.new.sending.SAVED_NOT_SENT');
		expect(mockToast.success).not.toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith('/invoices');
	});

	it('sends nothing to an address that is not one', async () => {
		const saveAndSend = jest.fn();
		render(
			<SaveInvoiceDialog
				open
				invoice={invoiceOf({ primaryEmail: 'billing@acme.test', saveAndSend })}
				onClose={jest.fn()}
			/>
		);
		fireEvent.change(screen.getByLabelText('invoices.send.RECIPIENT'), { target: { value: 'billing' } });

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'invoices.new.sending.SAVE_AND_SEND' }));
		});

		expect(saveAndSend).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('invoices.send.RECIPIENT_INVALID');
	});
});
