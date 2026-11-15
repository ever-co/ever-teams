/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TInvoiceSchedule, TInvoiceScheduleRun } from '@/core/types/schemas/organization/invoice-schedule.schema';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	)
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// The notice's motion reads matchMedia, which jsdom lacks: its title is what this section says
jest.mock('@/core/components/dashboards/kit/dashboard-states', () => ({
	DashboardErrorNotice: ({ title }: { title: string }) => <p role="alert">{title}</p>
}));
jest.mock('@/core/components/invoices/invoice-schedule-dialog', () => ({
	InvoiceScheduleDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">schedule form</div> : null)
}));
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertDialogConfirmation: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
		isOpen ? (
			<button type="button" onClick={onConfirm}>
				confirm delete
			</button>
		) : null
}));

const read = {
	schedule: null as TInvoiceSchedule | null,
	workspace: { tenantId: 'tenant-1', organizationId: 'org-1' },
	isLoading: false,
	isError: false,
	isUnavailable: false,
	refetch: jest.fn()
};
const runsRead = { runs: [] as TInvoiceScheduleRun[], isLoading: false, isError: false, refetch: jest.fn() };
const mutations = {
	createSchedule: jest.fn(),
	updateSchedule: jest.fn(),
	deleteSchedule: jest.fn(),
	isSaving: false,
	isDeleting: false
};
jest.mock('@/core/hooks/invoices/use-invoice-schedules', () => ({
	useClientInvoiceSchedule: () => read,
	useInvoiceScheduleRuns: () => runsRead,
	useInvoiceScheduleMutations: () => mutations
}));

import { ClientBillingScheduleSection } from './client-billing-schedule-section';

const client = { id: 'client-1', name: 'Acme', primaryEmail: 'billing@acme.test' };

const monthly: TInvoiceSchedule = {
	id: 'schedule-1',
	organizationContactId: 'client-1',
	frequency: 'MONTHLY',
	startDay: '2026-10-01',
	grouping: 'PROJECT',
	sendInvoice: true,
	pausedAt: null,
	activeSince: '2026-10-20T09:00:00Z',
	nextPeriod: { startDay: '2026-11-01', endDay: '2026-11-30', runDay: '2026-12-01' }
};

function renderSection(canManage = true) {
	return render(<ClientBillingScheduleSection client={client} todayKey="2026-11-15" canManage={canManage} />);
}

describe('ClientBillingScheduleSection', () => {
	beforeEach(() => {
		read.schedule = null;
		read.isLoading = false;
		read.isError = false;
		read.isUnavailable = false;
		runsRead.runs = [];
		jest.clearAllMocks();
	});

	it('offers to set up a schedule to whoever may make invoices, and only to them', () => {
		const { unmount } = renderSection();

		expect(screen.getByText('invoices.schedule.NONE_HINT')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.SET_UP' }));
		expect(screen.getByRole('dialog')).toBeTruthy();
		unmount();

		renderSection(false);
		expect(screen.queryByRole('button', { name: 'invoices.schedule.SET_UP' })).toBeNull();
	});

	it('states the schedule, the next invoice and the last runs, with their invoices and why some made none', () => {
		read.schedule = monthly;
		runsRead.runs = [
			{
				id: 'run-2',
				periodStart: '2026-10-01',
				periodEnd: '2026-10-31',
				status: 'SENT',
				reason: 'TIME_LEFT_OUT',
				claimedAt: '2026-10-31T23:05:00Z',
				leftOutSeconds: 7200,
				invoiceId: 'invoice-42',
				invoice: { id: 'invoice-42', invoiceNumber: 42, status: 'SENT', totalValue: 420, currency: 'USD' }
			},
			{
				id: 'run-1',
				periodStart: '2026-09-01',
				periodEnd: '2026-09-30',
				status: 'NO_TIME',
				reason: 'NO_BILLABLE_TIME',
				claimedAt: '2026-09-30T23:05:00Z'
			}
		];

		renderSection();

		expect(screen.getByText(/invoices\.schedule\.SUMMARY/)).toBeTruthy();
		expect(screen.getByText(/invoices\.schedule\.DELIVERY_SEND \{"email":"billing@acme\.test"\}/)).toBeTruthy();
		expect(screen.getByText(/invoices\.schedule\.NEXT /)).toBeTruthy();
		expect(screen.getByText('invoices.schedule.ACTIVE')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'invoices.NUMBER {"number":"42"}' }).getAttribute('href')).toContain(
			'invoice-42'
		);
		expect(screen.getByText('invoices.schedule.LEFT_OUT {"hours":2}')).toBeTruthy();
		expect(screen.getByText('invoices.schedule.reason.NO_BILLABLE_TIME')).toBeTruthy();
	});

	it('pauses an active schedule, and resumes a paused one, which then shows no next invoice', async () => {
		read.schedule = monthly;
		mutations.updateSchedule.mockResolvedValue({ ...monthly, pausedAt: '2026-11-15T10:00:00Z', nextPeriod: null });
		const { rerender } = renderSection();

		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.PAUSE' }));
		await waitFor(() =>
			expect(mutations.updateSchedule).toHaveBeenCalledWith({
				scheduleId: 'schedule-1',
				change: { paused: true }
			})
		);

		read.schedule = { ...monthly, pausedAt: '2026-11-15T10:00:00Z', nextPeriod: null };
		rerender(<ClientBillingScheduleSection client={client} todayKey="2026-11-15" canManage />);
		expect(screen.getByText('invoices.schedule.NEXT_PAUSED')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'invoices.schedule.RESUME' }));
		await waitFor(() =>
			expect(mutations.updateSchedule).toHaveBeenLastCalledWith({
				scheduleId: 'schedule-1',
				change: { paused: false }
			})
		);
	});

	it('deletes the schedule once the deletion is confirmed', async () => {
		read.schedule = monthly;
		mutations.deleteSchedule.mockResolvedValue(undefined);
		renderSection();

		fireEvent.click(screen.getByRole('button', { name: 'common.DELETE' }));
		fireEvent.click(screen.getByRole('button', { name: 'confirm delete' }));

		await waitFor(() => expect(mutations.deleteSchedule).toHaveBeenCalledWith('schedule-1'));
	});

	it('says when the schedule could not be read', () => {
		read.isError = true;

		renderSection();

		expect(screen.getByText('invoices.schedule.ERROR')).toBeTruthy();
	});

	it('shows nothing against an API without billing schedules, where no retry would help', () => {
		read.isError = true;
		read.isUnavailable = true;

		const { container } = renderSection();

		expect(container.innerHTML).toBe('');
	});
});
