/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { ApiErrorService } from '@/core/services/client/api-error.service';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	consequences: Array<{ key: string; text: React.ReactNode }>;
	isPending: boolean;
	error: string | null;
	onClose: () => void;
	onConfirm: () => void;
};

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('@/core/components/icons', () => ({
	Alert: () => null,
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
				<ul>
					{props.consequences.map((consequence) => (
						<li key={consequence.key}>{consequence.text}</li>
					))}
				</ul>
				<button type="button" onClick={props.onClose}>
					leave
				</button>
				<button type="button" onClick={props.onConfirm} disabled={props.isPending}>
					confirm
				</button>
				{props.error && <p role="alert">{props.error}</p>}
			</div>
		);
	}
}));

import { SaveInvoiceDialog } from './save-invoice-dialog';

function invoiceOf(fields: Partial<NewInvoiceState>) {
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
		isSaving: false,
		isWaiting: false,
		haveEarlierFailed: false,
		save: jest.fn(),
		...fields
	};
	return invoice as NewInvoiceState;
}

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
	function confirmButton() {
		return screen.getByRole<HTMLButtonElement>('button', { name: 'confirm' });
	}

	it('waits for the read before it can be confirmed', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({ isWaiting: true })} onClose={jest.fn()} />);

		expect(confirmButton().disabled).toBe(true);
	});

	it('can be confirmed once nothing is read again', () => {
		render(<SaveInvoiceDialog open invoice={invoiceOf({})} onClose={jest.fn()} />);

		expect(confirmButton().disabled).toBe(false);
	});
});

describe('a save of a new invoice that failed', () => {
	async function confirmFailingWith(error: unknown) {
		const save = jest.fn().mockRejectedValue(error);
		render(<SaveInvoiceDialog open invoice={invoiceOf({ save })} onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		return screen.findByRole('alert');
	}

	it('says the invoice may exist when no answer confirmed the save', async () => {
		const lostAnswer = ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' });

		const message = await confirmFailingWith(lostAnswer);

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
