/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { invoiceTermsOf, type InvoiceLine } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

const mockCreateInvoice = jest.fn();
const mockOrganizationRead = { isError: false, refetch: jest.fn() };
const mockClients: Array<{ id: string; name: string; paymentTermsDays?: number | null }> = [
	{ id: 'client-acme', name: 'Acme' }
];

const mockLine: InvoiceLine = {
	key: 'project-site:member-ada',
	projectId: 'project-site',
	employeeId: 'member-ada',
	taskId: null,
	seconds: 36000,
	hours: 10,
	rate: 80,
	currency: 'USD',
	amount: 800,
	rateSource: 'member',
	isAverageRate: false
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('client=client-acme') }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({
	useCurrentOrganizationOwner: () => mockOrganizationRead
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useActiveClients: () => ({
		clients: mockClients,
		isLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('./use-invoice-time', () => ({
	useInvoiceTime: () => ({
		hasProjects: true,
		lines: [mockLine],
		unpriced: [],
		isLoading: false,
		isError: false,
		isUpdating: false,
		refetch: jest.fn()
	})
}));
jest.mock('./use-invoices-query', () => ({
	useNextInvoiceNumber: () => ({ nextNumber: 7, isLoading: false, isError: false, refetch: jest.fn() }),
	useClientInvoices: () => ({ invoices: [], isLoading: false, isError: false })
}));
jest.mock('./use-invoice-mutations', () => ({
	useCreateInvoice: () => ({ createInvoice: mockCreateInvoice, isSaving: false })
}));

import { useNewInvoice } from './use-new-invoice';

const tokyoOrganization = { id: 'organization-1', name: 'Acme Works', timeZone: 'Asia/Tokyo' } as TOrganization;

function renderNewInvoice(organization: TOrganization | null) {
	const store = createStore();
	store.set(currentOrganizationState, organization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<Provider store={store}>{children}</Provider>
	);
	return renderHook(() => useNewInvoice(), { wrapper });
}

describe('saving a new invoice and the organisation it is dated by', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
		mockOrganizationRead.isError = false;
	});

	it('saves nothing before the organisation is read', async () => {
		const { result } = renderNewInvoice(null);
		act(() => result.current.setDueDay('2099-12-31'));

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});

		expect(saved).toBeNull();
		expect(mockCreateInvoice).not.toHaveBeenCalled();
		expect(result.current.isOrganizationLoading).toBe(true);
		expect(result.current.hasOrganizationFailed).toBe(false);
	});

	it('says so when the organisation could not be read', () => {
		mockOrganizationRead.isError = true;

		const { result } = renderNewInvoice(null);

		expect(result.current.hasOrganizationFailed).toBe(true);
		expect(result.current.isOrganizationLoading).toBe(false);
	});

	it('dates the invoice in the time zone of the organisation once it is read', async () => {
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));

		await act(async () => {
			await result.current.save();
		});

		expect(mockCreateInvoice).toHaveBeenCalledTimes(1);
		const request = mockCreateInvoice.mock.calls[0][0];
		expect(request.dueDate).toBe('2099-12-31T14:59:59.999Z');
		expect(result.current.isOrganizationLoading).toBe(false);
	});
});

describe('the note to the client', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
	});

	it('starts with the workspace’s default terms and is saved under the period', async () => {
		const organization = { ...tokyoOrganization, defaultInvoiceEstimateTerms: 'Payment by bank transfer.' };
		const { result } = renderNewInvoice(organization);
		act(() => result.current.setDueDay('2099-12-31'));

		await act(async () => {
			await result.current.save();
		});

		expect(result.current.note).toBe('Payment by bank transfer.');
		const request = mockCreateInvoice.mock.calls[0][0];
		expect(request.terms).toBe(invoiceTermsOf(result.current.periodDays, 'Payment by bank transfer.'));
	});

	it('keeps what the user writes instead', () => {
		const organization = { ...tokyoOrganization, defaultInvoiceEstimateTerms: 'Payment by bank transfer.' };
		const { result } = renderNewInvoice(organization);

		act(() => result.current.setNote(''));

		expect(result.current.note).toBe('');
	});
});

function listClients(...clients: typeof mockClients) {
	mockClients.splice(0, mockClients.length, ...clients);
}

describe('the due date of a new invoice', () => {
	afterEach(() => listClients({ id: 'client-acme', name: 'Acme' }));

	it('is the issue date plus the 14 days of the client’s payment terms, without typing', () => {
		listClients({ id: 'client-acme', name: 'Acme', paymentTermsDays: 14 });
		const { result } = renderNewInvoice({ ...tokyoOrganization, daysUntilDue: 30 });

		act(() => result.current.setIssueDay('2026-11-02'));

		expect(result.current.dueDay).toBe('2026-11-16');
		expect(result.current.dueTerm).toEqual({ source: 'client', days: 14 });
		expect(result.current.isDueDayOfTerm).toBe(true);
	});

	it('follows the terms of the next client chosen, after a day picked by hand', () => {
		listClients(
			{ id: 'client-acme', name: 'Acme', paymentTermsDays: 14 },
			{ id: 'client-globex', name: 'Globex', paymentTermsDays: null }
		);
		const { result } = renderNewInvoice({ ...tokyoOrganization, daysUntilDue: 45 });
		act(() => result.current.setIssueDay('2026-11-02'));
		act(() => result.current.setDueDay('2026-11-30'));

		expect(result.current.isDueDayOfTerm).toBe(false);

		act(() => result.current.changeClient('client-globex'));

		expect(result.current.dueDay).toBe('2026-12-17');
		expect(result.current.dueTerm).toEqual({ source: 'organization', days: 45 });
		expect(result.current.isDueDayOfTerm).toBe(true);
	});
});
