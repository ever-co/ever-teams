/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { invoiceTermsOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

const mockInvoices = { getInvoice: jest.fn() };
const mockReports = { getBillableTimeLogs: jest.fn() };

// Getters: the mocked modules load before this file's constants are set, and read them only when called
jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	get invoiceService() {
		return mockInvoices;
	}
}));
jest.mock('@/core/services/client/api/timesheets/time-log-report.service', () => ({
	get timeLogReportService() {
		return mockReports;
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/lib/helpers/date-and-time', () => ({ getDefaultTimezone: () => 'UTC' }));

import { useInvoicesRecordingTime } from './use-invoices-recording-time';

const octoberInvoice: TInvoice = {
	id: 'invoice-a',
	terms: invoiceTermsOf({ fromDay: '2026-10-01', toDay: '2026-10-31' })
};
const lateSeptemberInvoice: TInvoice = {
	id: 'invoice-b',
	terms: invoiceTermsOf({ fromDay: '2026-09-15', toDay: '2026-10-14' })
};

const savedLines: Record<string, Array<{ id: string; projectId: string }>> = {
	'invoice-a': [
		{ id: 'a-line-1', projectId: 'project-site' },
		{ id: 'a-line-2', projectId: 'project-app' }
	],
	'invoice-b': [{ id: 'b-line-1', projectId: 'project-site' }]
};

function answerInvoiceReads() {
	mockInvoices.getInvoice.mockImplementation(async (invoiceId: string) => ({
		id: invoiceId,
		invoiceItems: savedLines[invoiceId]
	}));
}

function renderRecording(invoices: TInvoice[], enabled: boolean) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useInvoicesRecordingTime(invoices, enabled), { wrapper });
}

describe('the earlier invoices that record the time they bill', () => {
	beforeEach(() => {
		mockInvoices.getInvoice.mockReset();
		mockReports.getBillableTimeLogs.mockReset();
	});

	it('are those whose every line a time log of their periods names', async () => {
		answerInvoiceReads();
		mockReports.getBillableTimeLogs.mockResolvedValue([
			{ id: 'log-1', invoiceItemId: 'a-line-1' },
			{ id: 'log-2', invoiceItemId: 'a-line-2' },
			{ id: 'log-3', invoiceItemId: null }
		]);

		const { result } = renderRecording([octoberInvoice, lateSeptemberInvoice], true);
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect([...result.current.recordedIds]).toEqual(['invoice-a']);
		expect(result.current.isError).toBe(false);
		const [range, , options] = mockReports.getBillableTimeLogs.mock.calls[0];
		expect(range.projectIds).toEqual(['project-app', 'project-site']);
		expect(range.from).toEqual(new Date(2026, 8, 14));
		expect(range.to).toEqual(new Date(2026, 10, 1, 23, 59, 59, 999));
		expect(options).toEqual({
			notInvoiced: false,
			scope: { tenantId: 'tenant-1', organizationId: 'organization-1' }
		});
	});

	it('are being checked while their lines or their time are read', async () => {
		answerInvoiceReads();
		mockReports.getBillableTimeLogs.mockReturnValue(new Promise(() => undefined));

		const { result } = renderRecording([octoberInvoice], true);

		await waitFor(() => expect(mockReports.getBillableTimeLogs).toHaveBeenCalled());
		expect(result.current.isLoading).toBe(true);
		expect(result.current.recordedIds.size).toBe(0);
	});

	it('could not be checked when one of them could not be read', async () => {
		mockInvoices.getInvoice.mockRejectedValue(new Error('not found'));

		const { result } = renderRecording([octoberInvoice], true);

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockReports.getBillableTimeLogs).not.toHaveBeenCalled();
	});

	it('are not read from an API that does not record billed time', () => {
		const { result } = renderRecording([octoberInvoice], false);

		expect(result.current).toEqual({ recordedIds: new Set(), isLoading: false, isError: false });
		expect(mockInvoices.getInvoice).not.toHaveBeenCalled();
	});
});
