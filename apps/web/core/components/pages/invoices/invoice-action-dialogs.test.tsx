/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import type { InvoiceActionTarget } from './invoice-action-dialogs';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	confirmLabel: string;
	onConfirm: () => void;
	extra?: React.ReactNode;
	error?: string | null;
};

const mockSendInvoice = jest.fn();
const mockChangeStatus = jest.fn();
const mockDeleteInvoice = jest.fn();
const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };

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
	CircleX: () => null,
	FileText: () => null,
	Invoice: () => null,
	Mail: () => null,
	Refresh: () => null,
	Send: () => null,
	Trash: () => null
}));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
jest.mock('@/core/hooks/invoices/use-invoice-mutations', () => ({
	useSendInvoice: () => ({ sendInvoice: mockSendInvoice, isSending: false }),
	useChangeInvoiceStatus: () => ({ changeStatus: mockChangeStatus, isChanging: false, changingId: null }),
	useDeleteInvoice: () => ({ deleteInvoice: mockDeleteInvoice, isDeleting: false })
}));
jest.mock('@/core/components/projects/dialogs/project-confirm-dialog', () => ({
	ProjectConfirmDialog: (props: MockConfirmDialogProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={props.title}>
				{props.extra}
				{props.error && <p>{props.error}</p>}
				<button type="button" onClick={props.onConfirm}>
					{props.confirmLabel}
				</button>
			</div>
		);
	}
}));

import {
	DeleteInvoiceDialog,
	SendInvoiceDialog,
	VoidAndReplaceDialog,
	VoidInvoiceDialog
} from './invoice-action-dialogs';

function targetIn(status: string, primaryEmail: string | null = 'billing@acme.test'): InvoiceActionTarget {
	const invoice = {
		id: 'inv-42',
		invoiceNumber: 42,
		status,
		totalValue: 1080,
		currency: 'USD',
		toContact: { id: 'client-acme', name: 'Acme', primaryEmail }
	} as TInvoice;
	return { invoice, numberText: '42', clientName: 'Acme' };
}

async function confirm(label: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: label }));
	});
}

beforeEach(() => {
	mockSendInvoice.mockReset();
	mockChangeStatus.mockReset();
	mockDeleteInvoice.mockReset();
	mockToast.success.mockReset();
	mockToast.warning.mockReset();
	mockToast.error.mockReset();
});

describe('sending an invoice from the list', () => {
	it('e-mails a draft to its client’s address, marks it Sent and says where it went', async () => {
		mockSendInvoice.mockResolvedValue('sent');
		const onClose = jest.fn();
		render(<SendInvoiceDialog open target={targetIn('DRAFT')} onClose={onClose} />);

		await confirm('invoices.send.CONFIRM');

		expect(mockSendInvoice).toHaveBeenCalledWith({
			invoiceId: 'inv-42',
			invoiceNumber: 42,
			email: 'billing@acme.test',
			marksSent: true
		});
		expect(mockToast.success).toHaveBeenCalledWith('invoices.send.SENT');
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('keeps the status of an invoice sent again', async () => {
		mockSendInvoice.mockResolvedValue('sent');
		render(<SendInvoiceDialog open target={targetIn('VIEWED')} onClose={jest.fn()} />);

		await confirm('invoices.send.CONFIRM');

		expect(mockSendInvoice.mock.calls[0][0]).toMatchObject({ marksSent: false });
	});

	it('says so in the dialog when the sending is refused, and stays open', async () => {
		mockSendInvoice.mockRejectedValue(new Error('Forbidden'));
		const onClose = jest.fn();
		render(<SendInvoiceDialog open target={targetIn('DRAFT')} onClose={onClose} />);

		await confirm('invoices.send.CONFIRM');

		expect(screen.getByText('invoices.send.FAILED')).toBeTruthy();
		expect(onClose).not.toHaveBeenCalled();
		expect(mockToast.success).not.toHaveBeenCalled();
	});

	it('asks for an address when the client has none, and sends nothing until one is typed', async () => {
		render(<SendInvoiceDialog open target={targetIn('DRAFT', null)} onClose={jest.fn()} />);

		await confirm('invoices.send.CONFIRM');

		expect(mockSendInvoice).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('invoices.send.RECIPIENT_INVALID');
	});
});

describe('voiding and deleting an invoice from the list', () => {
	it('voids the invoice in the API once confirmed and says so', async () => {
		mockChangeStatus.mockResolvedValue(undefined);
		const onClose = jest.fn();
		render(<VoidInvoiceDialog open target={targetIn('SENT')} onClose={onClose} />);

		await confirm('invoices.void.CONFIRM');

		expect(mockChangeStatus).toHaveBeenCalledWith({ invoiceId: 'inv-42', change: { status: 'VOID' } });
		expect(mockToast.success).toHaveBeenCalledWith('invoices.void.DONE');
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('deletes the draft in the API once confirmed and says so', async () => {
		mockDeleteInvoice.mockResolvedValue(undefined);
		const onClose = jest.fn();
		render(<DeleteInvoiceDialog open target={targetIn('DRAFT')} onClose={onClose} />);

		await confirm('invoices.delete.CONFIRM');

		expect(mockDeleteInvoice).toHaveBeenCalledWith('inv-42');
		expect(mockToast.success).toHaveBeenCalledWith('invoices.delete.DONE');
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('keeps the dialog open with the reason when the API refuses the deletion', async () => {
		mockDeleteInvoice.mockRejectedValue(new Error('Not Found'));
		const onClose = jest.fn();
		render(<DeleteInvoiceDialog open target={targetIn('DRAFT')} onClose={onClose} />);

		await confirm('invoices.delete.CONFIRM');

		expect(screen.getByText('invoices.delete.FAILED')).toBeTruthy();
		expect(onClose).not.toHaveBeenCalled();
	});
});

describe('voiding a paid invoice to replace it', () => {
	it('voids it once confirmed, then opens its replacement', async () => {
		mockChangeStatus.mockResolvedValue(undefined);
		const onClose = jest.fn();
		const onVoided = jest.fn();
		const target = targetIn('FULLY_PAID');
		render(<VoidAndReplaceDialog open target={target} onClose={onClose} onVoided={onVoided} />);

		await confirm('invoices.replace.CONFIRM');

		expect(mockChangeStatus).toHaveBeenCalledWith({ invoiceId: 'inv-42', change: { status: 'VOID' } });
		expect(mockToast.success).toHaveBeenCalledWith('invoices.void.DONE');
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onVoided).toHaveBeenCalledWith(target);
	});

	it('opens no replacement when the invoice could not be voided, and stays open', async () => {
		mockChangeStatus.mockRejectedValue(new Error('Forbidden'));
		const onClose = jest.fn();
		const onVoided = jest.fn();
		render(<VoidAndReplaceDialog open target={targetIn('PARTIALLY_PAID')} onClose={onClose} onVoided={onVoided} />);

		await confirm('invoices.replace.CONFIRM');

		expect(screen.getByText('invoices.void.FAILED')).toBeTruthy();
		expect(onVoided).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});
