/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	onClose: () => void;
};

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('@/core/components/icons', () => ({
	Building: () => null,
	Calendar: () => null,
	Clock: () => null,
	FileText: () => null,
	Invoice: () => null
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
			</div>
		);
	}
}));

import { SaveInvoiceDialog } from './save-invoice-dialog';

function invoiceOf(isSaving: boolean) {
	const invoice: Partial<NewInvoiceState> = {
		numberText: '42',
		client: { id: 'client-acme', name: 'Acme' },
		periodDays: { fromDay: '2026-10-01', toDay: '2026-10-31' },
		keptLines: [],
		keptHours: 0,
		total: 0,
		currency: 'USD',
		issueDay: '2026-11-12',
		dueDay: '2026-12-11',
		isSaving,
		save: jest.fn()
	};
	return invoice as NewInvoiceState;
}

describe('leaving the confirmation of a new invoice', () => {
	it('keeps the dialog while the invoice is being saved', () => {
		const onClose = jest.fn();
		render(<SaveInvoiceDialog open invoice={invoiceOf(true)} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes the dialog when nothing is being saved', () => {
		const onClose = jest.fn();
		render(<SaveInvoiceDialog open invoice={invoiceOf(false)} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
