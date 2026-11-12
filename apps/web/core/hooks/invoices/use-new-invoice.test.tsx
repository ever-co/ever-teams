/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { InvoiceLine } from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

const mockCreateInvoice = jest.fn();
const mockOrganizationRead = { isError: false, refetch: jest.fn() };
const mockEarlierRead = { invoices: [], isLoading: false, isRefreshing: false, isError: false, refetch: jest.fn() };
const mockNextNumber = { nextNumber: 7, isLoading: false, isError: false, refetch: jest.fn() };

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
	rateSource: 'member'
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('client=client-acme') }));
let mockOrganizationCookie = 'organization-1';
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => mockOrganizationCookie
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
const mockTime = {
	hasProjects: true,
	lines: [mockLine],
	unpriced: [],
	isLoading: false,
	isError: false,
	isUpdating: false,
	refetch: jest.fn()
};

jest.mock('./use-invoice-time', () => ({
	useInvoiceTime: () => mockTime
}));
jest.mock('./use-invoices-query', () => ({
	useNextInvoiceNumber: () => mockNextNumber,
	useClientInvoices: () => mockEarlierRead
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

describe('saving a new invoice after another tab switched the workspace', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
		mockOrganizationRead.isError = false;
		mockOrganizationCookie = 'organization-1';
	});

	it('makes the invoice in the organization its client and time were read in', async () => {
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));

		await act(async () => {
			await result.current.save();
		});

		expect(mockCreateInvoice.mock.calls[0][0]).toEqual(
			expect.objectContaining({ organizationId: 'organization-1', tenantId: 'tenant-1' })
		);
	});

	it('sends nothing once the workspace in the cookies is another one', async () => {
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));
		mockOrganizationCookie = 'organization-2';

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});

		expect(saved).toBeNull();
		expect(mockCreateInvoice).not.toHaveBeenCalled();
	});
});

describe('saving a new invoice and the invoices already saved for its client', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
	});

	afterEach(() => {
		mockEarlierRead.isLoading = false;
	});

	it('waits while they are read: an overlap with one of them could not be shown yet', async () => {
		mockEarlierRead.isLoading = true;
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});

		expect(saved).toBeNull();
		expect(mockCreateInvoice).not.toHaveBeenCalled();
		expect(result.current.problems).toEqual(['readingEarlier']);
	});
});

describe('saving a new invoice while its billable time is read again', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
	});

	afterEach(() => {
		mockTime.isUpdating = false;
	});

	it('waits: the lines on screen can still change', async () => {
		mockTime.isUpdating = true;
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});

		expect(saved).toBeNull();
		expect(mockCreateInvoice).not.toHaveBeenCalled();
		expect(result.current.problems).toEqual(['readingTime']);
		expect(result.current.isWaiting).toBe(true);
	});
});

describe('saving a new invoice again after a save that failed', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockNextNumber.nextNumber = 7;
	});

	async function renderAfterFailedSave(error: unknown) {
		mockCreateInvoice.mockRejectedValueOnce(error);
		const rendered = renderNewInvoice(tokyoOrganization);
		act(() => rendered.result.current.setDueDay('2099-12-31'));
		await act(async () => {
			await rendered.result.current.save().catch(() => undefined);
		});
		// The highest number is read again: 7 is taken now if that save went through
		mockNextNumber.nextNumber = 8;
		rendered.rerender();
		return rendered;
	}

	it('keeps the number of a save whose outcome is unknown: a second try cannot create a second invoice', async () => {
		const lostAnswer = ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' });

		const { result } = await renderAfterFailedSave(lostAnswer);

		expect(mockCreateInvoice.mock.calls[0][0].invoiceNumber).toBe(7);
		expect(result.current.numberText).toBe('7');
	});

	it('moves on to the next free number after the API refused the save', async () => {
		const refusal = ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 400',
			status: 400,
			response: { data: {}, headers: {}, status: 400, statusText: 'Bad Request' }
		});

		const { result } = await renderAfterFailedSave(refusal);

		expect(result.current.numberText).toBe('8');
	});
});

describe('the issue date a new invoice starts with', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('is today in the time zone of the organisation, even when the browser is still on the day before', () => {
		// 10:05 UTC is already the 13th on Kiritimati (UTC+14), and still the 12th or earlier in every other zone
		jest.useFakeTimers({ now: new Date('2026-11-12T10:05:00.000Z'), doNotFake: ['setTimeout', 'setInterval'] });
		const kiritimatiOrganization = {
			...tokyoOrganization,
			timeZone: 'Pacific/Kiritimati',
			daysUntilDue: 30
		} as TOrganization;

		const { result } = renderNewInvoice(kiritimatiOrganization);

		expect(result.current.issueDay).toBe('2026-11-13');
		expect(result.current.dueDay).toBe('2026-12-13');
	});
});
