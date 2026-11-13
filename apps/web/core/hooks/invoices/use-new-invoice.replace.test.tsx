/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { savedInvoiceOf, type SavedInvoice } from '@/core/lib/utils/invoice-edit';
import { invoiceTermsOf, todayDayKey } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

const mockCreateInvoice = jest.fn();
const mockTimeCalls: Array<{ enabled?: boolean }> = [];
const mockTime = {
	hasProjects: true,
	lines: [],
	unpriced: [],
	isLoading: false,
	isError: false,
	isUpdating: false,
	refetch: jest.fn()
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('replaces=invoice-42') }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({
	useCurrentOrganizationOwner: () => ({ isError: false, refetch: jest.fn() })
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useActiveClients: () => ({ clients: [], isLoading: false, isError: false, refetch: jest.fn() })
}));
jest.mock('./use-invoice-time', () => ({
	useInvoiceTime: (options: { enabled?: boolean }) => {
		mockTimeCalls.push(options);
		return mockTime;
	}
}));
jest.mock('./use-invoices-query', () => ({
	useNextInvoiceNumber: () => ({ nextNumber: 7, isLoading: false, isError: false, refetch: jest.fn() }),
	useClientInvoices: () => ({ invoices: [], isLoading: false, isError: false, refetch: jest.fn() })
}));
jest.mock('./use-invoice-mutations', () => ({
	useCreateInvoice: () => ({ createInvoice: mockCreateInvoice, isSaving: false }),
	useSaveAndSendInvoice: () => ({ saveAndSendInvoice: jest.fn(), isSavingAndSending: false })
}));

import { useNewInvoice } from './use-new-invoice';

const parisOrganization = { id: 'organization-1', name: 'Acme Works', timeZone: 'Europe/Paris' } as TOrganization;

const voidInvoice: TSavedInvoice = {
	id: 'invoice-42',
	invoiceNumber: 42,
	invoiceDate: '2026-10-31T23:00:00.000Z',
	dueDate: '2026-11-30T22:59:59.999Z',
	currency: 'USD',
	totalValue: 1080,
	status: 'VOID',
	terms: invoiceTermsOf({ fromDay: '2026-10-01', toDay: '2026-10-31' }, 'Payment by bank transfer.'),
	toContactId: 'client-acme',
	toContact: { id: 'client-acme', name: 'Acme Studio', primaryEmail: 'billing@acme.test', imageUrl: null },
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	organizationContactId: 'client-acme',
	invoiceType: 'BY_PROJECT_HOURS',
	discountValue: 10,
	discountType: 'PERCENT',
	tax: 20,
	taxType: 'PERCENT',
	tax2: 0,
	tax2Type: 'PERCENT',
	invoiceItems: [
		{
			id: 'item-1',
			description: 'Ana Lima, design',
			price: 80,
			quantity: 10,
			totalValue: 800,
			applyTax: true,
			applyDiscount: true,
			projectId: 'p1',
			employeeId: 'ana',
			taskId: null,
			project: { id: 'p1', name: 'Website' }
		},
		{
			id: 'item-2',
			description: 'Bo Chen',
			price: 40,
			quantity: 5,
			totalValue: 200,
			applyTax: true,
			applyDiscount: true,
			projectId: 'p1',
			employeeId: 'bo',
			taskId: null,
			project: { id: 'p1', name: 'Website' }
		}
	]
};

function replacedInvoice(): SavedInvoice {
	const reading = { timeZone: 'Europe/Paris', unnamedProject: 'Unnamed project', clientNames: new Map() };
	const saved = savedInvoiceOf(voidInvoice, reading);
	if (!saved) {
		throw new Error('The void invoice was expected to be readable');
	}
	return saved;
}

function renderReplacement(replaced: SavedInvoice) {
	const store = createStore();
	store.set(currentOrganizationState, parisOrganization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<Provider store={store}>{children}</Provider>
	);
	return renderHook(() => useNewInvoice(replaced), { wrapper });
}

describe('a new invoice that replaces a void one', () => {
	beforeEach(() => {
		mockCreateInvoice.mockReset();
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-43' });
		mockTimeCalls.length = 0;
	});

	it('starts from its client, period, lines, note, discount and tax, under the next number and today’s dates', () => {
		const replaced = replacedInvoice();

		const { result } = renderReplacement(replaced);

		expect(result.current.mode).toBe('replace');
		expect(result.current.client).toMatchObject({ id: 'client-acme', name: 'Acme Studio' });
		expect(result.current.periodDays).toEqual({ fromDay: '2026-10-01', toDay: '2026-10-31' });
		expect(result.current.linesSource).toBe('saved');
		expect(result.current.keptLines.map((line) => line.label)).toEqual(['Ana Lima, design', 'Bo Chen']);
		expect(result.current.note).toBe('Payment by bank transfer.');
		expect(result.current.discountText).toBe('10');
		expect(result.current.taxText).toBe('20');
		expect(result.current.total).toBe(1080);
		expect(result.current.numberText).toBe('7');
		expect(result.current.issueDay).toBe(todayDayKey('Europe/Paris'));
	});

	it('reads no time until it is taken again', () => {
		const { result } = renderReplacement(replacedInvoice());

		expect(mockTimeCalls.at(-1)?.enabled).toBe(false);

		act(() => result.current.takeTimeAgain());

		expect(result.current.linesSource).toBe('time');
		expect(mockTimeCalls.at(-1)?.enabled).toBe(true);
	});

	it('is saved as a new draft, its lines under its own id, the void invoice left as it is', async () => {
		const { result } = renderReplacement(replacedInvoice());

		await act(async () => {
			await result.current.save();
		});

		const request = mockCreateInvoice.mock.calls[0][0];
		expect(request).toMatchObject({
			invoiceNumber: 7,
			status: 'DRAFT',
			toContactId: 'client-acme',
			totalValue: 1080
		});
		expect(request.id).not.toBe('invoice-42');
		expect(request.invoiceItems.map((item: { invoiceId: string }) => item.invoiceId)).toEqual([
			request.id,
			request.id
		]);
	});
});
