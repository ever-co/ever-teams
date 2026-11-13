/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { savedInvoiceOf, type SavedInvoice } from '@/core/lib/utils/invoice-edit';
import { invoiceTermsOf, type NamedInvoiceLine } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';
import type { TSavedInvoice, TSavedInvoiceItem } from '@/core/types/schemas/organization/invoice.schema';

const mockSaveInvoiceEdit = jest.fn();
const mockNextNumberCalls: boolean[] = [];
const mockTimeCalls: Array<{ enabled?: boolean; billedLines?: { lineIds: ReadonlySet<string> } }> = [];
const mockTime = {
	hasProjects: true,
	lines: [] as NamedInvoiceLine[],
	unpriced: [],
	isLoading: false,
	isError: false,
	isUpdating: false,
	refetch: jest.fn(),
	recordsBilledTime: null as boolean | null,
	billedTimeByLine: new Map<string, ReadonlyArray<string>>()
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => mockCookieScope.tenantId,
	getOrganizationIdCookie: () => mockCookieScope.organizationId
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
	useNextInvoiceNumber: (enabled: boolean) => {
		mockNextNumberCalls.push(enabled);
		return { nextNumber: null, isLoading: false, isError: false, refetch: jest.fn() };
	},
	useClientInvoices: () => ({
		invoices: [{ id: 'invoice-42', terms: 'Billable time from 2026-10-01 to 2026-10-31' }],
		isLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('./use-invoice-mutations', () => ({
	useSaveInvoiceEdit: () => ({ saveInvoiceEdit: mockSaveInvoiceEdit, isSavingEdit: false })
}));
const mockRecording = { recordedIds: new Set<string>(), isLoading: false, isError: false };
const mockRecordingCalls: boolean[] = [];
jest.mock('./use-invoices-recording-time', () => ({
	useInvoicesRecordingTime: (_invoices: unknown, enabled: boolean) => {
		mockRecordingCalls.push(enabled);
		return mockRecording;
	}
}));

import { useInvoiceEdit } from './use-invoice-edit';

const parisOrganization = { id: 'organization-1', name: 'Acme Works', timeZone: 'Europe/Paris' } as TOrganization;

function item(extra: Partial<TSavedInvoiceItem>): TSavedInvoiceItem {
	return {
		id: 'item',
		description: '',
		price: 80,
		quantity: 10,
		totalValue: 800,
		applyTax: true,
		applyDiscount: true,
		projectId: 'p1',
		employeeId: 'ana',
		taskId: null,
		project: { id: 'p1', name: 'Website' },
		...extra
	};
}

function sentInvoice(status = 'SENT'): TSavedInvoice {
	return {
		id: 'invoice-42',
		invoiceNumber: 42,
		invoiceDate: '2026-10-31T23:00:00.000Z',
		dueDate: '2026-11-30T22:59:59.999Z',
		currency: 'USD',
		totalValue: 1080,
		status,
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
			item({ id: 'item-1', description: 'Ana Lima, design' }),
			item({ id: 'item-2', description: 'Bo Chen', employeeId: 'bo', price: 40, quantity: 5, totalValue: 200 })
		]
	};
}

function savedOf(invoice: TSavedInvoice): SavedInvoice {
	const reading = { timeZone: 'Europe/Paris', unnamedProject: 'Unnamed project', clientNames: new Map() };
	const saved = savedInvoiceOf(invoice, reading);
	if (!saved) {
		throw new Error('The invoice was expected to be readable');
	}
	return saved;
}

function renderEdit(saved: SavedInvoice) {
	const store = createStore();
	store.set(currentOrganizationState, parisOrganization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<Provider store={store}>{children}</Provider>
	);
	return renderHook(() => useInvoiceEdit(saved), { wrapper });
}

function timeLine(extra: Partial<NamedInvoiceLine>): NamedInvoiceLine {
	return {
		key: 'p1|ana',
		projectId: 'p1',
		employeeId: 'ana',
		taskId: null,
		seconds: 43200,
		hours: 12,
		rate: 80,
		currency: 'USD',
		amount: 960,
		rateSource: 'member',
		isAverageRate: false,
		projectName: 'Website',
		memberName: 'Ana Lima',
		label: 'Ana Lima',
		...extra
	};
}

beforeEach(() => {
	mockSaveInvoiceEdit.mockReset();
	mockSaveInvoiceEdit.mockResolvedValue({ outcome: { status: 'saved' }, sending: null });
	mockNextNumberCalls.length = 0;
	mockTimeCalls.length = 0;
	mockTime.lines = [];
	mockCookieScope.organizationId = 'organization-1';
	mockCookieScope.tenantId = 'tenant-1';
});

describe('an invoice opened to be edited', () => {
	it('shows its lines, number, dates, note, discount and tax as they were saved', () => {
		const { result } = renderEdit(savedOf(sentInvoice()));

		expect(result.current.mode).toBe('edit');
		expect(result.current.linesSource).toBe('saved');
		expect(result.current.keptLines.map((line) => line.label)).toEqual(['Ana Lima, design', 'Bo Chen']);
		expect(result.current.numberText).toBe('42');
		expect(result.current.issueDay).toBe('2026-11-01');
		expect(result.current.dueDay).toBe('2026-11-30');
		expect(result.current.note).toBe('Payment by bank transfer.');
		expect(result.current.discountText).toBe('10');
		expect(result.current.taxText).toBe('20');
		expect(result.current.total).toBe(1080);
	});

	it('reads neither the next free number nor the time, and leaves itself out of the client’s earlier invoices', () => {
		const { result } = renderEdit(savedOf(sentInvoice()));

		expect(mockNextNumberCalls.every((enabled) => !enabled)).toBe(true);
		expect(mockTimeCalls.every((options) => options.enabled === false)).toBe(true);
		expect(result.current.earlierInvoices).toEqual([]);
		expect(result.current.overlappingInvoices).toEqual([]);
	});

	it('saves nothing while nothing has changed, and says so', async () => {
		const { result } = renderEdit(savedOf(sentInvoice()));

		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});

		expect(saved).toBeNull();
		expect(mockSaveInvoiceEdit).not.toHaveBeenCalled();
		expect(result.current.problems).toEqual(['unchanged']);
	});

	it('saves a change under the invoice’s id and status, with what to put back if it fails', async () => {
		const saved = savedOf(sentInvoice());
		const { result } = renderEdit(saved);
		act(() => result.current.setDueDay('2026-12-15'));

		await act(async () => {
			await result.current.save();
		});

		const { edit, sending } = mockSaveInvoiceEdit.mock.calls[0][0];
		expect(sending).toBeNull();
		expect(edit.invoiceId).toBe('invoice-42');
		expect(edit.previous).toBe(saved.previous);
		expect(edit.revision.update).toMatchObject({ invoiceNumber: 42, status: 'SENT', totalValue: 1080 });
		expect(edit.revision.update.dueDate).toBe('2026-12-15T22:59:59.999Z');
		expect(edit.revision.lines.map((line: { invoiceId: string }) => line.invoiceId)).toEqual([
			'invoice-42',
			'invoice-42'
		]);
		expect(result.current.changes.dueDay).toEqual({ before: '2026-11-30', after: '2026-12-15' });
	});

	it('sends a sent invoice again without taking its status back, and marks a draft Sent', async () => {
		const sent = renderEdit(savedOf(sentInvoice('SENT')));
		const draft = renderEdit(savedOf(sentInvoice('DRAFT')));
		act(() => sent.result.current.setNote('Thank you.'));
		act(() => draft.result.current.setNote('Thank you.'));

		await act(async () => {
			await sent.result.current.saveAndSend('billing@acme.test');
			await draft.result.current.saveAndSend('billing@acme.test');
		});

		const [sentCall, draftCall] = mockSaveInvoiceEdit.mock.calls.map(([request]) => request.sending);
		expect(sentCall).toEqual({
			invoiceId: 'invoice-42',
			invoiceNumber: 42,
			email: 'billing@acme.test',
			marksSent: false,
			scope: { organizationId: 'organization-1', tenantId: 'tenant-1' }
		});
		expect(draftCall.marksSent).toBe(true);
	});

	it('takes the time again, keeping what was written on a line still there', () => {
		mockTime.lines = [
			timeLine({}),
			timeLine({ key: 'p1|cy', employeeId: 'cy', label: 'Cy Diaz', hours: 2, amount: 160, seconds: 7200 })
		];
		const { result } = renderEdit(savedOf(sentInvoice()));

		act(() => result.current.takeTimeAgain());

		expect(result.current.linesSource).toBe('time');
		expect(mockTimeCalls.at(-1)?.enabled).toBe(true);
		expect(result.current.descriptions.get('p1|ana')).toBe('Ana Lima, design');
		expect(result.current.changes).toMatchObject({ addedLines: 1, removedLines: 1, repricedLines: 1 });

		act(() => result.current.backToSavedLines());

		expect(result.current.linesSource).toBe('saved');
		expect(result.current.problems).toEqual(['unchanged']);
	});
});

describe('an edit and the workspace its invoice belongs to', () => {
	async function saveNote(result: { current: ReturnType<typeof useInvoiceEdit> }) {
		act(() => result.current.setNote('Thank you.'));
		let saved: unknown = 'not answered';
		await act(async () => {
			saved = await result.current.save();
		});
		return saved;
	}

	it('is written in that workspace', async () => {
		const { result } = renderEdit(savedOf(sentInvoice()));

		await saveNote(result);

		const { edit } = mockSaveInvoiceEdit.mock.calls[0][0];
		expect(edit.revision.update).toMatchObject({ organizationId: 'organization-1', tenantId: 'tenant-1' });
	});

	it('sends nothing when the invoice was opened in another workspace', async () => {
		mockCookieScope.organizationId = 'organization-2';
		const { result } = renderEdit(savedOf(sentInvoice()));

		const saved = await saveNote(result);

		expect(saved).toBeNull();
		expect(mockSaveInvoiceEdit).not.toHaveBeenCalled();
	});

	it('sends nothing once another tab switched the workspace', async () => {
		const { result } = renderEdit(savedOf(sentInvoice()));
		mockCookieScope.tenantId = 'tenant-2';

		const saved = await saveNote(result);

		expect(saved).toBeNull();
		expect(mockSaveInvoiceEdit).not.toHaveBeenCalled();
	});
});

describe('the time an edited invoice bills', () => {
	type WrittenLine = { employeeId?: string; timeLogIds?: string[] };

	function billedTimeOf(lines: ReadonlyArray<WrittenLine>) {
		return lines.map((line) => [line.employeeId, line.timeLogIds]);
	}

	afterEach(() => {
		mockTime.recordsBilledTime = null;
		mockTime.billedTimeByLine = new Map();
	});

	it('is read for its saved lines, whatever lines are shown', () => {
		renderEdit(savedOf(sentInvoice()));

		const billedLines = mockTimeCalls.at(-1)?.billedLines;
		expect([...(billedLines?.lineIds ?? [])]).toEqual(['item-1', 'item-2']);
	});

	it('is named on each saved line, and on the lines written back when the save fails half way', async () => {
		mockTime.recordsBilledTime = true;
		mockTime.billedTimeByLine = new Map([['item-1', ['log-1', 'log-2']]]);
		const { result } = renderEdit(savedOf(sentInvoice()));
		act(() => result.current.setDueDay('2026-12-15'));

		await act(async () => {
			await result.current.save();
		});

		const { edit } = mockSaveInvoiceEdit.mock.calls[0][0];
		const billed = [
			['ana', ['log-1', 'log-2']],
			['bo', undefined]
		];
		expect(billedTimeOf(edit.revision.lines)).toEqual(billed);
		expect(billedTimeOf(edit.previous.lines)).toEqual(billed);
	});

	it('is read again once the dialog is closed when part of it was billed elsewhere meanwhile', async () => {
		mockSaveInvoiceEdit.mockResolvedValue({ outcome: { status: 'timeBilled' }, sending: null });
		mockTime.refetch.mockClear();
		const { result } = renderEdit(savedOf(sentInvoice()));
		act(() => result.current.setDueDay('2026-12-15'));

		await act(async () => {
			await result.current.save();
		});

		expect(mockTime.refetch).not.toHaveBeenCalled();
		act(() => result.current.readDeferredTime());
		expect(mockTime.refetch).toHaveBeenCalledTimes(1);
	});
});
