/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { invoiceTermsOf, type InvoiceLine } from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

const mockCreateInvoice = jest.fn();
const mockSaveAndSendInvoice = jest.fn();
const mockOrganizationRead = { isError: false, refetch: jest.fn() };
const mockClients: Array<{ id: string; name: string; paymentTermsDays?: number | null }> = [
	{ id: 'client-acme', name: 'Acme' }
];
const mockEarlierRead = { invoices: [], isLoading: false, isError: false, refetch: jest.fn() };
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
	useCreateInvoice: () => ({ createInvoice: mockCreateInvoice, isSaving: false }),
	useSaveAndSendInvoice: () => ({ saveAndSendInvoice: mockSaveAndSendInvoice, isSavingAndSending: false })
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

describe('the discount and the tax of a new invoice', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
	});

	it('shows the total after a 10 % discount and a 20 % tax, and saves that same total', async () => {
		const { result } = renderNewInvoice(tokyoOrganization);
		act(() => result.current.setDueDay('2099-12-31'));
		act(() => result.current.changeDiscount('10'));
		act(() => result.current.changeTax('20'));

		await act(async () => {
			await result.current.save();
		});

		expect(result.current.totals).toEqual({ subtotal: 800, discount: 80, discounted: 720, tax: 144, total: 864 });
		expect(result.current.total).toBe(864);
		expect(mockCreateInvoice.mock.calls[0][0]).toMatchObject({ discountValue: 10, tax: 20, totalValue: 864 });
	});

	it('keeps out of the fields what is not a percent from 0 to 100', () => {
		const { result } = renderNewInvoice(tokyoOrganization);

		act(() => result.current.changeDiscount('ten'));
		act(() => result.current.changeTax('150'));

		expect(result.current.discountText).toBe('');
		expect(result.current.taxText).toBe('');
		expect(result.current.hasAdjustments).toBe(false);
		expect(result.current.total).toBe(800);
	});
});

describe('saving a new invoice and sending it', () => {
	beforeEach(() => {
		mockSaveAndSendInvoice.mockReset();
		mockSaveAndSendInvoice.mockResolvedValue({ invoice: { id: 'invoice-1' }, outcome: 'sent' });
	});

	it('saves the invoice and sends it to the address given, in one step', async () => {
		const { result } = renderNewInvoice(tokyoOrganization);

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveAndSend('billing@acme.test');
		});

		expect(saved).toEqual({ invoice: { id: 'invoice-1' }, outcome: 'sent' });
		expect(mockSaveAndSendInvoice).toHaveBeenCalledTimes(1);
		const { request, email } = mockSaveAndSendInvoice.mock.calls[0][0];
		expect(email).toBe('billing@acme.test');
		expect(request).toMatchObject({ invoiceNumber: 7, status: 'DRAFT', toContactId: 'client-acme' });
	});

	it('sends nothing before the organisation is read', async () => {
		const { result } = renderNewInvoice(null);

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.saveAndSend('billing@acme.test');
		});

		expect(saved).toBeNull();
		expect(mockSaveAndSendInvoice).not.toHaveBeenCalled();
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
