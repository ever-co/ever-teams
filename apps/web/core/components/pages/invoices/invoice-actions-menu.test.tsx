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
	Pencil: () => null,
	Refresh: () => null,
	Send: () => null,
	Trash: () => null,
	Undo: () => null
}));
jest.mock('./invoice-access-guard', () => ({
	editInvoicePathOf: (invoiceId: string) => `/invoices/${invoiceId}/edit`
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

describe('the menu of an invoice made from billable time, for a role that may create invoices', () => {
	const madeFromTime = 'Billable time from 2026-10-01 to 2026-10-31';

	function revisableIn(status: string) {
		return { ...invoiceIn(status), terms: madeFromTime } as TInvoice;
	}

	it('opens the editor of an invoice nothing was paid on from its first row', () => {
		render(
			<InvoiceActionsMenu
				invoice={revisableIn('SENT')}
				numberText="42"
				isChanging={false}
				onAction={jest.fn()}
				canRevise
			/>
		);

		const edit = screen.getByRole('link', { name: 'common.EDIT' });
		expect(edit.getAttribute('href')).toBe('/invoices/inv-42/edit');
		expect(rowLabels()).toEqual([
			'invoices.actions.SEND_AGAIN',
			'invoices.actions.MARK_PAID',
			'invoices.actions.VOID'
		]);
	});

	it('offers to void and replace an invoice something was paid on, last after the hairline', () => {
		const onAction = jest.fn();
		const invoice = revisableIn('PARTIALLY_PAID');
		render(
			<InvoiceActionsMenu invoice={invoice} numberText="42" isChanging={false} onAction={onAction} canRevise />
		);

		expect(screen.queryByRole('link', { name: 'common.EDIT' })).toBeNull();
		expect(rowLabels()).toEqual([
			'invoices.actions.SEND_AGAIN',
			'invoices.actions.MARK_PAID',
			'invoices.replace.ACTION'
		]);
		expect(screen.getAllByRole('separator')).toHaveLength(1);
		fireEvent.click(screen.getByRole('button', { name: 'invoices.replace.ACTION' }));
		expect(onAction).toHaveBeenCalledWith(invoice, 'voidAndReplace');
	});

	it('neither edits nor replaces for a role that may not create invoices, nor an invoice made elsewhere', () => {
		const { unmount } = render(
			<InvoiceActionsMenu
				invoice={revisableIn('DRAFT')}
				numberText="42"
				isChanging={false}
				onAction={jest.fn()}
			/>
		);
		expect(screen.queryByRole('link', { name: 'common.EDIT' })).toBeNull();
		unmount();

		render(
			<InvoiceActionsMenu
				invoice={invoiceIn('FULLY_PAID')}
				numberText="42"
				isChanging={false}
				onAction={jest.fn()}
				canRevise
			/>
		);
		expect(rowLabels()).toEqual(['invoices.actions.SEND_AGAIN', 'invoices.actions.MARK_UNPAID']);
	});

	it('offers nothing on a void invoice, which is never reopened', () => {
		const { container } = render(
			<InvoiceActionsMenu
				invoice={revisableIn('VOID')}
				numberText="42"
				isChanging={false}
				onAction={jest.fn()}
				canRevise
			/>
		);

		expect(container.innerHTML).toBe('');
	});
});
