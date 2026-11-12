/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { InvoiceLine } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

const mockCreateInvoice = jest.fn();
const mockOrganizationRead = { isError: false, refetch: jest.fn() };

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
		clients: [{ id: 'client-acme', name: 'Acme' }],
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
