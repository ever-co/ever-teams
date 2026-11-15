/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TInvoiceSchedule } from '@/core/types/schemas/organization/invoice-schedule.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/components/common/app-dialog', () => ({
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		open ? <div>{children}</div> : null,
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: ''
}));
jest.mock('@/core/components/common/segmented-control', () => ({
	SegmentedControl: ({
		items,
		onValueChange
	}: {
		items: Array<{ value: string; label: string }>;
		onValueChange: (value: string) => void;
	}) => (
		<div>
			{items.map((item) => (
				<button key={item.value} type="button" onClick={() => onValueChange(item.value)}>
					{item.label}
				</button>
			))}
		</div>
	)
}));

import { InvoiceScheduleDialog } from './invoice-schedule-dialog';

const client = { id: 'client-1', name: 'Acme', primaryEmail: 'billing@acme.test' };

const schedule: TInvoiceSchedule = {
	id: 'schedule-1',
	organizationContactId: 'client-1',
	frequency: 'MONTHLY',
	startDay: '2026-10-01',
	grouping: 'PROJECT',
	sendInvoice: false,
	pausedAt: null,
	activeSince: '2026-10-20T09:00:00Z'
};

function renderDialog(onUpdate: jest.Mock) {
	return render(
		<InvoiceScheduleDialog
			open
			client={client}
			schedule={schedule}
			todayKey="2026-11-15"
			onCreate={jest.fn()}
			onUpdate={onUpdate}
			onClose={jest.fn()}
		/>
	);
}

describe('InvoiceScheduleDialog', () => {
	it('sends a save that changes no field: saving the schedule is taking it over', async () => {
		const onUpdate = jest.fn().mockResolvedValue(undefined);
		renderDialog(onUpdate);

		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.form.SAVE' }));

		await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({}));
	});

	it('sends only the fields that changed', async () => {
		const onUpdate = jest.fn().mockResolvedValue(undefined);
		renderDialog(onUpdate);

		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.grouping.TASK' }));
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.form.SEND' }));
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.form.SAVE' }));

		await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ grouping: 'TASK', sendInvoice: true }));
	});
});
