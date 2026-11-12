/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({
	CircleCheck: () => null,
	CircleX: () => null,
	Download: () => null,
	Loader: () => null,
	MoreHorizontal: () => null,
	Send: () => null,
	Trash: () => null,
	Undo: () => null
}));
// The menu renders its rows inline, so they can be read without opening it.
jest.mock('@headlessui/react', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return { Menu: Pass, MenuButton: Pass, MenuItems: Pass, MenuItem: Pass, MenuSeparator: () => <hr /> };
});

import { InvoiceActionsMenu } from './invoice-actions-menu';

function invoiceIn(status: string) {
	return { id: 'inv-42', invoiceNumber: 42, status } as TInvoice;
}

function rowLabels() {
	return screen.queryAllByRole('button').map((row) => row.textContent);
}

describe('the actions menu of an invoice', () => {
	it('offers a draft to be sent, settled, voided or deleted, deleting last', () => {
		render(
			<InvoiceActionsMenu invoice={invoiceIn('DRAFT')} numberText="42" isChanging={false} onAction={jest.fn()} />
		);

		expect(rowLabels()).toEqual([
			'invoices.actions.SEND',
			'invoices.actions.MARK_PAID',
			'invoices.actions.VOID',
			'invoices.actions.DELETE'
		]);
		expect(screen.getAllByRole('separator')).toHaveLength(1);
	});

	it('says Send again once the invoice was sent, and never deletes it', () => {
		render(
			<InvoiceActionsMenu invoice={invoiceIn('SENT')} numberText="42" isChanging={false} onAction={jest.fn()} />
		);

		expect(rowLabels()).toEqual([
			'invoices.actions.SEND_AGAIN',
			'invoices.actions.MARK_PAID',
			'invoices.actions.VOID'
		]);
	});

	it('hands the action picked over with its invoice', () => {
		const onAction = jest.fn();
		const invoice = invoiceIn('FULLY_PAID');
		render(<InvoiceActionsMenu invoice={invoice} numberText="42" isChanging={false} onAction={onAction} />);

		fireEvent.click(screen.getByRole('button', { name: 'invoices.actions.MARK_UNPAID' }));

		expect(onAction).toHaveBeenCalledWith(invoice, 'markUnpaid');
	});

	it('offers the PDF first when the row has no room for its own download button', () => {
		const onDownload = jest.fn();
		render(
			<InvoiceActionsMenu
				invoice={invoiceIn('SENT')}
				numberText="42"
				isChanging={false}
				onAction={jest.fn()}
				download={{ isPending: false, onSelect: onDownload }}
			/>
		);

		expect(rowLabels()).toEqual([
			'invoices.actions.DOWNLOAD',
			'invoices.actions.SEND_AGAIN',
			'invoices.actions.MARK_PAID',
			'invoices.actions.VOID'
		]);
		fireEvent.click(screen.getByRole('button', { name: 'invoices.actions.DOWNLOAD' }));
		expect(onDownload).toHaveBeenCalledTimes(1);
	});

	it('renders nothing for a void invoice', () => {
		const { container } = render(
			<InvoiceActionsMenu invoice={invoiceIn('VOID')} numberText="42" isChanging={false} onAction={jest.fn()} />
		);

		expect(container.innerHTML).toBe('');
	});
});
