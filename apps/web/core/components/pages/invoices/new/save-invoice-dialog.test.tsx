/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { ApiErrorService } from '@/core/services/client/api-error.service';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	consequences: Array<{ key: string; text: React.ReactNode }>;
	isPending: boolean;
	error: string | null;
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
	Alert: () => null,
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
				<ul>
					{props.consequences.map((consequence) => (
						<li key={consequence.key}>{consequence.text}</li>
					))}
				</ul>
				<button type="button" onClick={props.onClose}>
					leave
				</button>
				{props.extra}
				{props.secondaryAction && (
					<button type="button" onClick={props.secondaryAction.onClick}>
						{props.secondaryAction.label}
					</button>
				)}
				<button type="button" onClick={props.onConfirm} disabled={props.isPending}>
					{props.confirmLabel}
				</button>
				{props.error && <p role="alert">{props.error}</p>}
			</div>
		);
	}
}));

import { SaveInvoiceDialog } from './save-invoice-dialog';

interface InvoiceOptions extends Partial<NewInvoiceState> {
	primaryEmail?: string | null;
}

function invoiceOf({ primaryEmail = null, ...fields }: InvoiceOptions = {}) {
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
		isSaving: false,
		isWaiting: false,
		haveEarlierFailed: false,
		save: jest.fn(),
		saveAndSend: jest.fn(),
		...fields
	};
	return invoice as NewInvoiceState;
}

const SAVE = 'invoices.new.SAVE';

const SAVE_AND_SEND = 'invoices.new.sending.SAVE_AND_SEND';

function lostAnswer() {
	return ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' });
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

describe('confirming a new invoice while what it is made of is read again', () => {
	function confirmButton(name: string) {
		return screen.getByRole<HTMLButtonElement>('button', { name });
	}

	it('waits for the read before it can be confirmed', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({ isWaiting: true })} onClose={jest.fn()} />);

		expect(confirmButton(SAVE).disabled).toBe(true);
	});

	it('can be confirmed once nothing is read again', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({})} onClose={jest.fn()} />);

		expect(confirmButton(SAVE).disabled).toBe(false);
	});

	it('waits for the read before it can be saved and sent', () => {
		const invoice = invoiceOf({ primaryEmail: 'billing@acme.test', isWaiting: true });
		render(<SaveInvoiceDialog open invoice={invoice} onClose={jest.fn()} />);

		expect(confirmButton(SAVE_AND_SEND).disabled).toBe(true);
	});
});

describe('a save of a new invoice that failed', () => {
	async function confirmFailingWith(error: unknown) {
		const save = jest.fn().mockRejectedValue(error);
		render(<SaveInvoiceDialog open invoice={invoiceOf({ save })} onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: SAVE }));
		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		return screen.findByRole('alert');
	}

	it('says the invoice may exist when no answer confirmed the save', async () => {
		const message = await confirmFailingWith(lostAnswer());

		expect(message.textContent).toBe('invoices.new.confirm.UNCONFIRMED');
	});

	it('says nothing was created when the API refused the save', async () => {
		const refusal = ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 400',
			status: 400,
			response: { data: {}, headers: {}, status: 400, statusText: 'Bad Request' }
		});

		const message = await confirmFailingWith(refusal);

		expect(message.textContent).toBe('invoices.new.confirm.FAILED');
	});

	it('says the invoice may exist when no answer confirmed a save and send', async () => {
		const saveAndSend = jest.fn().mockRejectedValue(lostAnswer());
		const invoice = invoiceOf({ primaryEmail: 'billing@acme.test', saveAndSend });
		render(<SaveInvoiceDialog open invoice={invoice} onClose={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND }));
		const message = await screen.findByRole('alert');

		expect(message.textContent).toBe('invoices.new.confirm.UNCONFIRMED');
		expect(mockPush).not.toHaveBeenCalled();
	});
});

describe('the confirmation of a new invoice and the invoices already saved for its client', () => {
	it('says the period was not checked against them when they could not be read', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({ haveEarlierFailed: true })} onClose={jest.fn()} />);

		expect(screen.getByText('invoices.new.confirm.UNCHECKED')).toBeTruthy();
	});

	it('says nothing of it once they were read', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({})} onClose={jest.fn()} />);

		expect(screen.queryByText('invoices.new.confirm.UNCHECKED')).toBeNull();
	});
});

describe('saving a new invoice and sending it', () => {
	it('offers to save only when the client has no e-mail', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf()} onClose={jest.fn()} />);

		expect(screen.getByRole('button', { name: SAVE })).toBeTruthy();
		expect(screen.queryByRole('button', { name: SAVE_AND_SEND })).toBeNull();
	});

	it('offers Save and send beside Save invoice, the client’s address shown and editable', () => {
		render(
			<SaveInvoiceDialog open invoice={invoiceOf({ primaryEmail: 'billing@acme.test' })} onClose={jest.fn()} />
		);

		const recipient = screen.getByLabelText('invoices.send.RECIPIENT') as HTMLInputElement;

		expect(recipient.value).toBe('billing@acme.test');
		expect(screen.getByRole('button', { name: SAVE })).toBeTruthy();
		expect(screen.getByRole('button', { name: SAVE_AND_SEND })).toBeTruthy();
	});

	it('saves and sends once to the address shown, however many clicks come while it runs', async () => {
		const saveAndSend = jest.fn().mockResolvedValue({ invoice: { id: 'inv-42' }, outcome: 'sent' });
		const invoice = invoiceOf({ primaryEmail: 'billing@acme.test', saveAndSend });
		render(<SaveInvoiceDialog open invoice={invoice} onClose={jest.fn()} />);
		fireEvent.change(screen.getByLabelText('invoices.send.RECIPIENT'), { target: { value: 'ap@acme.test' } });

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND }));
			fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND }));
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
			fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND }));
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
			fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND }));
		});

		expect(saveAndSend).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('invoices.send.RECIPIENT_INVALID');
	});
});
