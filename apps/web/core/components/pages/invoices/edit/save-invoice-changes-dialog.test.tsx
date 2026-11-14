/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InvoiceEditState } from '@/core/hooks/invoices/use-invoice-edit';
import type { InvoiceChanges, SavedInvoice } from '@/core/lib/utils/invoice-edit';

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
const mockTranslation = { showsValues: false };

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!mockTranslation.showsValues || !values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
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
	Mail: () => null,
	Pencil: () => null
}));
jest.mock('../invoice-access-guard', () => ({ INVOICES_PATH: '/invoices' }));
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

import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { SaveInvoiceChangesDialog } from './save-invoice-changes-dialog';

const NO_CHANGES: InvoiceChanges = {
	addedLines: 0,
	removedLines: 0,
	repricedLines: 0,
	rewrittenDescriptions: 0,
	total: null,
	issueDay: null,
	dueDay: null,
	number: null,
	discount: null,
	tax: null,
	currency: null,
	isNoteRewritten: false
};

const SAVE = 'invoices.edit.SAVE';

const SAVE_AND_SEND_AGAIN = 'invoices.edit.confirm.SAVE_AND_SEND_AGAIN';

interface InvoiceOptions extends Partial<InvoiceEditState> {
	status?: SavedInvoice['status'];
	primaryEmail?: string | null;
}

function invoiceOf({ status = 'DRAFT', primaryEmail = null, ...fields }: InvoiceOptions = {}) {
	const invoice: Partial<InvoiceEditState> = {
		numberText: '42',
		savedInvoice: { id: 'invoice-42', number: 42, status } as SavedInvoice,
		client: { id: 'client-acme', name: 'Acme Studio', primaryEmail },
		periodDays: { fromDay: '2026-10-01', toDay: '2026-10-31' },
		currency: 'USD',
		changes: { ...NO_CHANGES, removedLines: 1, total: { before: 1080, after: 864 } },
		isSaving: false,
		isWaiting: false,
		haveEarlierFailed: false,
		save: jest.fn().mockResolvedValue({ outcome: { status: 'saved' }, sending: null }),
		saveAndSend: jest.fn().mockResolvedValue({ outcome: { status: 'saved' }, sending: 'sent' }),
		...fields
	};
	return invoice as InvoiceEditState;
}

function rowTexts() {
	return screen.getAllByRole('listitem').map((row) => row.textContent);
}

beforeEach(() => {
	mockTranslation.showsValues = false;
	mockPush.mockReset();
	mockToast.success.mockReset();
	mockToast.warning.mockReset();
	mockToast.error.mockReset();
});

describe('the confirmation of an edit', () => {
	it('states each change, and that a draft stays one', () => {
		render(<SaveInvoiceChangesDialog open invoice={invoiceOf()} onClose={jest.fn()} />);

		expect(rowTexts()).toEqual([
			'invoices.new.confirm.CLIENT',
			'invoices.edit.confirm.LINES_REMOVED',
			'invoices.edit.confirm.TOTAL',
			'invoices.edit.confirm.STAYS_DRAFT'
		]);
		expect(screen.getByRole('dialog', { name: 'invoices.edit.confirm.TITLE' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: SAVE_AND_SEND_AGAIN })).toBeNull();
	});

	it('says the client has the earlier version of an invoice sent, and offers to send this one again', () => {
		render(
			<SaveInvoiceChangesDialog
				open
				invoice={invoiceOf({ status: 'SENT', primaryEmail: 'billing@acme.test' })}
				onClose={jest.fn()}
			/>
		);

		expect(rowTexts()).toContain('invoices.edit.confirm.EARLIER_VERSION');
		expect(rowTexts()).toContain('invoices.edit.confirm.SEND_AGAIN');
		expect(screen.getByRole('button', { name: SAVE_AND_SEND_AGAIN })).toBeTruthy();
		expect(screen.getByRole('button', { name: SAVE })).toBeTruthy();
		expect(screen.getByLabelText<HTMLInputElement>('invoices.send.RECIPIENT').value).toBe('billing@acme.test');
	});

	it('states the earlier total in the currency it was billed in', () => {
		mockTranslation.showsValues = true;
		const changes = { ...NO_CHANGES, currency: { before: 'USD', after: 'EUR' }, total: { before: 100, after: 90 } };
		render(<SaveInvoiceChangesDialog open invoice={invoiceOf({ currency: 'EUR', changes })} onClose={jest.fn()} />);

		const totalRow = rowTexts().find((text) => text?.startsWith('invoices.edit.confirm.TOTAL'));
		const totals = { total: formatOwed(90, 'EUR', 'en'), before: formatOwed(100, 'USD', 'en') };
		expect(totalRow).toBe(`invoices.edit.confirm.TOTAL ${JSON.stringify(totals)}`);
	});

	it('goes back to the list once saved', async () => {
		const invoice = invoiceOf();
		render(<SaveInvoiceChangesDialog open invoice={invoice} onClose={jest.fn()} />);

		const save = screen.getByRole<HTMLButtonElement>('button', { name: SAVE });
		fireEvent.click(save);

		await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/invoices'));
		await waitFor(() => expect(save.disabled).toBe(false));
		expect(mockToast.success).toHaveBeenCalledWith('invoices.new.SAVED');
	});
});

describe('an edit that could not be saved', () => {
	async function failingWith(outcome: unknown) {
		const save = jest.fn().mockResolvedValue({ outcome, sending: null });
		render(<SaveInvoiceChangesDialog open invoice={invoiceOf({ save })} onClose={jest.fn()} />);
		const button = screen.getByRole<HTMLButtonElement>('button', { name: SAVE });
		fireEvent.click(button);
		const message = await screen.findByRole('alert');
		await waitFor(() => expect(button.disabled).toBe(false));
		return message;
	}

	it.each([
		['nothing changed when the API refused it', { status: 'notSaved' }, 'NOT_SAVED'],
		[
			'the connection failed and nothing changed when its first write never reached the API',
			{ status: 'notReached' },
			'NOT_REACHED'
		],
		['the invoice was put back as it was', { status: 'putBack' }, 'PUT_BACK'],
		[
			'how many lines it holds when it could not be put back',
			{ status: 'notPutBack', lineCount: 0 },
			'NOT_PUT_BACK_LINES'
		],
		[
			'nothing was saved when something was paid on it, or it was voided, since it was opened',
			{ status: 'locked' },
			'LOCKED_NOW'
		]
	])('says %s, and stays on the invoice', async (_says, outcome, messageKey) => {
		const message = await failingWith(outcome);

		expect(message.textContent).toBe(`invoices.edit.confirm.${messageKey}`);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('keeps the refusal on screen and reports it when something was paid on it since it was opened', async () => {
		const save = jest.fn().mockResolvedValue({ outcome: { status: 'locked' }, sending: null });
		const onLockedRefusal = jest.fn();
		render(
			<SaveInvoiceChangesDialog
				open
				invoice={invoiceOf({ save })}
				onClose={jest.fn()}
				onLockedRefusal={onLockedRefusal}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: SAVE }));

		const message = await screen.findByRole('alert');
		expect(message.textContent).toBe('invoices.edit.confirm.LOCKED_NOW');
		expect(onLockedRefusal).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('tells the page when nothing could be sent, the workspace having been switched in another tab', async () => {
		const save = jest.fn().mockResolvedValue(null);
		const onSaveFailed = jest.fn();
		render(
			<SaveInvoiceChangesDialog
				open
				invoice={invoiceOf({ save })}
				onClose={jest.fn()}
				onSaveFailed={onSaveFailed}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: SAVE }));

		await screen.findByRole('alert');
		expect(onSaveFailed).toHaveBeenCalledTimes(1);
	});

	it.each([
		['not put back', { status: 'notPutBack', lineCount: 0 }, 1],
		['refused by the API', { status: 'notSaved' }, 1],
		['saved', { status: 'saved' }, 0]
	])(
		'tells the page when a save did not go through (%s), so it reads the invoice once closed',
		async (_case, outcome, calls) => {
			const save = jest.fn().mockResolvedValue({ outcome, sending: null });
			const onSaveFailed = jest.fn();
			render(
				<SaveInvoiceChangesDialog
					open
					invoice={invoiceOf({ save })}
					onClose={jest.fn()}
					onSaveFailed={onSaveFailed}
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: SAVE }));

			await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
			await waitFor(() => expect(onSaveFailed).toHaveBeenCalledTimes(calls));
		}
	);

	it('reports no refusal of that kind when the API refused the edit', async () => {
		const save = jest.fn().mockResolvedValue({ outcome: { status: 'notSaved' }, sending: null });
		const onLockedRefusal = jest.fn();
		render(
			<SaveInvoiceChangesDialog
				open
				invoice={invoiceOf({ save })}
				onClose={jest.fn()}
				onLockedRefusal={onLockedRefusal}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: SAVE }));

		await screen.findByRole('alert');
		expect(onLockedRefusal).not.toHaveBeenCalled();
	});

	it('says nothing was saved when it was changed from elsewhere since it was opened', async () => {
		const message = await failingWith({ status: 'changed' });

		expect(message.textContent).toBe('invoices.edit.confirm.CHANGED');
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('says nothing was saved when it could not be read before the save', async () => {
		const message = await failingWith({ status: 'notChecked' });

		expect(message.textContent).toBe('invoices.edit.confirm.NOT_CHECKED');
	});

	it('asks to check it when it could not even be read again', async () => {
		const message = await failingWith({ status: 'notPutBack', lineCount: null });

		expect(message.textContent).toBe('invoices.edit.confirm.NOT_PUT_BACK');
	});
});

describe('saving an edit and sending it again', () => {
	it('says the edit was saved but not sent when the sending was refused', async () => {
		const saveAndSend = jest.fn().mockResolvedValue({ outcome: { status: 'saved' }, sending: 'notSent' });
		const invoice = invoiceOf({ status: 'SENT', primaryEmail: 'billing@acme.test', saveAndSend });
		render(<SaveInvoiceChangesDialog open invoice={invoice} onClose={jest.fn()} />);

		const send = screen.getByRole<HTMLButtonElement>('button', { name: SAVE_AND_SEND_AGAIN });
		fireEvent.click(send);

		await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/invoices'));
		await waitFor(() => expect(send.disabled).toBe(false));
		expect(saveAndSend).toHaveBeenCalledWith('billing@acme.test');
		expect(mockToast.error.mock.calls[0][0]).toBe('invoices.edit.SAVED_NOT_SENT');
	});

	it('saves nothing without an address to send it to', async () => {
		const saveAndSend = jest.fn();
		const invoice = invoiceOf({ status: 'SENT', primaryEmail: null, saveAndSend });
		render(<SaveInvoiceChangesDialog open invoice={invoice} onClose={jest.fn()} />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: SAVE_AND_SEND_AGAIN }));
		});

		expect(saveAndSend).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('invoices.send.RECIPIENT_INVALID');
	});
});
