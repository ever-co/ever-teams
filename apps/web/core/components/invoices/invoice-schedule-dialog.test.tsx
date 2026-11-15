/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TInvoiceSchedule } from '@/core/types/schemas/organization/invoice-schedule.schema';

const mockWeekStart = { current: 1 };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/hooks/common/use-workspace-week-start', () => ({
	useWorkspaceWeekStart: () => mockWeekStart.current
}));
// A workspace that writes its days year first, so the start day reads as the value it holds
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: 'YYYY-MM-DD', numberFormat: null, clock: null })
}));
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: '',
	AppDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
		open ? <div role="dialog">{children}</div> : null,
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>
}));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
// The control's sliding thumb measures itself, which jsdom cannot: each option stands as a button that picks it
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

const monthly: TInvoiceSchedule = {
	id: 'schedule-1',
	organizationContactId: 'client-1',
	frequency: 'MONTHLY',
	startDay: '2026-10-01',
	grouping: 'PROJECT',
	sendInvoice: false,
	pausedAt: null,
	activeSince: '2026-10-20T09:00:00Z',
	nextPeriod: { startDay: '2026-11-01', endDay: '2026-11-30', runDay: '2026-12-01' }
};

function renderDialog(schedule: TInvoiceSchedule | null = null) {
	const onCreate = jest.fn().mockResolvedValue(undefined);
	const onUpdate = jest.fn().mockResolvedValue(undefined);
	const onClose = jest.fn();
	render(
		<InvoiceScheduleDialog
			open
			client={client}
			schedule={schedule}
			todayKey="2026-11-15"
			onCreate={onCreate}
			onUpdate={onUpdate}
			onClose={onClose}
		/>
	);
	return { onCreate, onUpdate, onClose };
}

function startDayField() {
	return screen.getByLabelText('invoices.schedule.form.START_DAY') as HTMLInputElement;
}

describe('InvoiceScheduleDialog', () => {
	beforeEach(() => {
		mockWeekStart.current = 1;
	});

	it('saves a schedule it did not change, since whoever saves a schedule takes it over', async () => {
		const { onUpdate, onClose } = renderDialog(monthly);

		fireEvent.click(screen.getByText('invoices.schedule.form.SAVE'));

		await waitFor(() => expect(onClose).toHaveBeenCalled());
		expect(onUpdate).toHaveBeenCalledWith({});
	});

	it('sends only the fields that changed', async () => {
		const { onUpdate } = renderDialog(monthly);

		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.grouping.TASK' }));
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.form.SEND' }));
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.form.SAVE' }));

		await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ grouping: 'TASK', sendInvoice: true }));
	});

	it('starts a new weekly schedule on the first day of this week, as the workspace counts weeks', async () => {
		const { onCreate } = renderDialog();
		expect(startDayField().value).toBe('2026-11-01');

		// Sunday 15 November 2026, in a workspace whose weeks start on Monday
		fireEvent.click(screen.getByText('invoices.schedule.frequency.WEEKLY'));
		expect(startDayField().value).toBe('2026-11-09');

		fireEvent.click(screen.getByText('invoices.schedule.form.SAVE'));
		await waitFor(() =>
			expect(onCreate).toHaveBeenCalledWith({
				frequency: 'WEEKLY',
				startDay: '2026-11-09',
				grouping: 'PROJECT',
				sendInvoice: false
			})
		);
	});

	it('keeps the day its person picked, whatever the frequency', () => {
		mockWeekStart.current = 0;
		renderDialog();

		fireEvent.click(screen.getByText('invoices.schedule.frequency.BIWEEKLY'));
		expect(startDayField().value).toBe('2026-11-15');

		fireEvent.change(startDayField(), { target: { value: '2026-11-03' } });
		fireEvent.click(screen.getByText('invoices.schedule.frequency.MONTHLY'));
		expect(startDayField().value).toBe('2026-11-03');
	});
});
