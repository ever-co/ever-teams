import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	billedLinesReadOf,
	billedPreviousOf,
	billedSavedLinesOf,
	billsUnrecordedTimeOf,
	didNotReachApi,
	haveSameFields,
	haveSameLineIds,
	haveSameLines,
	hasInvoiceChanges,
	invoiceChangesOf,
	invoiceGroupingOfLines,
	invoiceNoteOfTerms,
	invoiceRevisionOf,
	isInvoiceOfWorkspace,
	percentTextOf,
	periodOfDays,
	savedInvoiceOf,
	savedInvoiceStatusOf,
	statedLinesOf,
	type InvoiceDraftFigures,
	type SavedInvoice,
	type SavedInvoiceReading
} from './invoice-edit';
import {
	buildInvoiceRequest,
	invoiceLineKeyOf,
	invoiceTermsOf,
	invoiceTimeOf,
	type BillableEntry,
	type InvoiceGrouping,
	type InvoiceItemRequest
} from './invoices';
import type { TSavedInvoice, TSavedInvoiceItem } from '@/core/types/schemas/organization/invoice.schema';

const reading: SavedInvoiceReading = {
	timeZone: 'Europe/Paris',
	unnamedProject: 'Unnamed project',
	clientNames: new Map([['client-acme', 'Acme Studio (archived)']])
};

function item(extra: Partial<TSavedInvoiceItem> = {}): TSavedInvoiceItem {
	return {
		id: 'item-1',
		description: 'Ana Lima',
		price: 80,
		quantity: 10,
		totalValue: 800,
		applyTax: true,
		applyDiscount: false,
		projectId: 'p1',
		employeeId: 'ana',
		taskId: null,
		project: { id: 'p1', name: 'Website' },
		...extra
	};
}

function savedRaw(extra: Partial<TSavedInvoice> = {}): TSavedInvoice {
	return {
		id: 'invoice-42',
		invoiceNumber: 42,
		invoiceDate: '2026-10-31T23:00:00.000Z',
		dueDate: '2026-11-30T22:59:59.999Z',
		currency: 'USD',
		totalValue: 1080,
		status: 'SENT',
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
			item({ id: 'item-1', description: 'Ana Lima', employeeId: 'ana', quantity: 10, totalValue: 800 }),
			item({
				id: 'item-2',
				description: 'Design review',
				employeeId: 'bo',
				quantity: 5,
				price: 100,
				totalValue: 500,
				projectId: 'p2',
				project: { id: 'p2', name: 'App' }
			})
		],
		...extra
	};
}

function readSaved(extra: Partial<TSavedInvoice> = {}): SavedInvoice {
	const saved = savedInvoiceOf(savedRaw(extra), reading);
	if (!saved) {
		throw new Error('The invoice was expected to be readable');
	}
	return saved;
}

describe('an invoice read back to be edited', () => {
	it('states its workspace, number, client, period, dates, note, discount and tax as it was saved', () => {
		const saved = readSaved();

		expect(saved).toMatchObject({
			id: 'invoice-42',
			workspace: { organizationId: 'organization-1', tenantId: 'tenant-1' },
			number: 42,
			status: 'SENT',
			client: { id: 'client-acme', name: 'Acme Studio', primaryEmail: 'billing@acme.test' },
			period: { fromDay: '2026-10-01', toDay: '2026-10-31' },
			issueDay: '2026-11-01',
			dueDay: '2026-11-30',
			currency: 'USD',
			discountPercent: 10,
			taxPercent: 20,
			note: 'Payment by bank transfer.',
			total: 1080,
			grouping: 'member'
		});
	});

	it('names a client the API dropped from the invoice, archived since, from the list of every client', () => {
		const saved = readSaved({ toContact: null });

		expect(saved.client).toEqual({
			id: 'client-acme',
			name: 'Acme Studio (archived)',
			primaryEmail: null,
			imageUrl: null
		});
	});

	it('lists its lines by project, each under the key its time would give it, and keeps what each one states', () => {
		const saved = readSaved();

		expect(
			saved.lines.map((line) => [line.key, line.projectName, line.label, line.hours, line.rate, line.amount])
		).toEqual([
			['p2|bo', 'App', 'Design review', 5, 100, 500],
			['p1|ana', 'Website', 'Ana Lima', 10, 80, 800]
		]);
		expect(saved.lines.every((line) => line.rateSource === 'saved')).toBe(true);
		expect(saved.descriptions.get('p2|bo')).toBe('Design review');
	});

	it('reads no discount or tax from zero', () => {
		const saved = readSaved({ discountValue: 0, tax: null, taxType: null });

		expect(saved.discountPercent).toBeNull();
		expect(saved.taxPercent).toBeNull();
	});

	it('keeps what to write back if an edit fails half way: its fields and its lines as they were', () => {
		const saved = readSaved();

		expect(saved.previous.update).toEqual({
			invoiceNumber: 42,
			invoiceDate: '2026-10-31T23:00:00.000Z',
			dueDate: '2026-11-30T22:59:59.999Z',
			currency: 'USD',
			discountValue: 10,
			discountType: 'PERCENT',
			tax: 20,
			taxType: 'PERCENT',
			tax2: 0,
			tax2Type: 'PERCENT',
			terms: savedRaw().terms,
			totalValue: 1080,
			status: 'SENT',
			invoiceType: 'BY_PROJECT_HOURS',
			organizationContactId: 'client-acme',
			toContactId: 'client-acme',
			organizationId: 'organization-1',
			tenantId: 'tenant-1'
		});
		expect(saved.previous.lines[0]).toEqual({
			description: 'Ana Lima',
			price: 80,
			quantity: 10,
			totalValue: 800,
			invoiceId: 'invoice-42',
			projectId: 'p1',
			employeeId: 'ana',
			applyTax: true,
			applyDiscount: false,
			organizationId: 'organization-1',
			tenantId: 'tenant-1'
		});
	});

	it('gives two lines of the same project and member two places', () => {
		const twice = [item({ id: 'a', description: 'First' }), item({ id: 'b', description: 'Second' })];

		const saved = readSaved({ invoiceItems: twice });

		expect(saved.lines.map((line) => line.key)).toEqual(['p1|ana', 'p1|ana#1']);
	});

	it.each([
		['states no period', { terms: 'Thanks for your business.' }],
		['has a flat discount', { discountType: 'FLAT' }],
		['has a second tax', { tax2: 5 }],
		['is billed by product', { invoiceType: 'BY_PRODUCTS' }],
		['has a line made from no project', { invoiceItems: [item({ projectId: null })] }],
		['has a status the web does not know', { status: 'ARCHIVED' }],
		['states no client', { toContactId: null }]
	])('is not edited here when it %s: it was not made from billable time by this screen', (_case, extra) => {
		expect(savedInvoiceOf(savedRaw(extra as Partial<TSavedInvoice>), reading)).toBeNull();
	});
});

describe('the grouping an invoice was made with', () => {
	it('is by project when no line names a member, by task when one names a task, else by member', () => {
		expect(invoiceGroupingOfLines([{ employeeId: null, taskId: null }])).toBe('project');
		expect(
			invoiceGroupingOfLines([
				{ employeeId: 'ana', taskId: 't1' },
				{ employeeId: 'bo', taskId: null }
			])
		).toBe('task');
		expect(invoiceGroupingOfLines([{ employeeId: 'ana', taskId: null }])).toBe('member');
		expect(invoiceGroupingOfLines([])).toBe('member');
	});

	it.each<InvoiceGrouping>(['project', 'member', 'task'])(
		'by %s, gives a line rebuilt from time the key of the saved line with the same project, member and task',
		(grouping) => {
			const entries: BillableEntry[] = [
				{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: 3600 },
				{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 7200 }
			];
			const priceOf = () => ({ rate: 80, currency: 'USD', source: 'member' as const });

			const { lines } = invoiceTimeOf({ entries, grouping, priceOf });

			for (const line of lines) {
				expect(invoiceLineKeyOf(line, grouping)).toBe(line.key);
			}
		}
	);
});

describe('the note and the figures of a saved invoice', () => {
	it('reads the note back from under the period, as it was written', () => {
		const days = { fromDay: '2026-10-01', toDay: '2026-10-31' };

		expect(invoiceNoteOfTerms(invoiceTermsOf(days, 'Payment by bank transfer.\nThank you.'))).toBe(
			'Payment by bank transfer.\nThank you.'
		);
		expect(invoiceNoteOfTerms(invoiceTermsOf(days))).toBe('');
		expect(invoiceNoteOfTerms(null)).toBe('');
	});

	it('puts a saved percent back in its field, and nothing for none', () => {
		expect(percentTextOf(8.875)).toBe('8.875');
		expect(percentTextOf(null)).toBe('');
	});

	it('reads the stated period back as the range its time is read in', () => {
		const period = periodOfDays({ fromDay: '2026-10-01', toDay: '2026-10-31' });

		expect(period?.from).toEqual(new Date(2026, 9, 1));
		expect(period?.to).toEqual(new Date(2026, 9, 31));
		expect(periodOfDays({ fromDay: 'soon', toDay: '2026-10-31' })).toBeNull();
	});
});

function requestOf(saved: SavedInvoice) {
	return buildInvoiceRequest({
		id: 'browser-made-id',
		organizationId: 'organization-1',
		tenantId: 'tenant-1',
		clientId: saved.client.id,
		invoiceNumber: 43,
		issueDay: '2026-11-02',
		dueDay: '2026-12-02',
		currency: 'USD',
		period: saved.period,
		timeZone: 'Europe/Paris',
		lines: saved.lines,
		descriptions: saved.descriptions,
		adjustments: { discountPercent: null, taxPercent: 20 },
		note: 'Payment by bank transfer.'
	});
}

describe('what an edit writes', () => {
	it('keeps the status the invoice reached and writes the fields the screen built', () => {
		const saved = readSaved();

		const { update } = invoiceRevisionOf(requestOf(saved), saved);

		expect(update).toMatchObject({
			invoiceNumber: 43,
			status: 'SENT',
			discountValue: 0,
			tax: 20,
			totalValue: 1560,
			toContactId: 'client-acme',
			invoiceType: 'BY_PROJECT_HOURS'
		});
		expect(update).not.toHaveProperty('paid');
		expect(update).not.toHaveProperty('invoiceItems');
	});

	it('writes every line under the id of the invoice edited', () => {
		const saved = readSaved();

		const { lines } = invoiceRevisionOf(requestOf(saved), saved);

		expect(lines).toHaveLength(2);
		expect(lines.every((line) => line.invoiceId === 'invoice-42')).toBe(true);
	});
});

function figuresOf(saved: SavedInvoice, extra: Partial<InvoiceDraftFigures> = {}): InvoiceDraftFigures {
	return {
		lines: statedLinesOf(saved.lines, saved.descriptions),
		number: saved.number,
		issueDay: saved.issueDay,
		dueDay: saved.dueDay,
		currency: saved.currency,
		discountPercent: saved.discountPercent,
		taxPercent: saved.taxPercent,
		note: saved.note,
		total: saved.total,
		billsUnrecordedTime: false,
		...extra
	};
}

describe('what an edit changes', () => {
	it('changes nothing until something is changed', () => {
		const saved = readSaved();

		expect(hasInvoiceChanges(invoiceChangesOf(saved, figuresOf(saved)))).toBe(false);
	});

	it('counts the lines removed, added and repriced, and the descriptions rewritten', () => {
		const saved = readSaved();
		const [design, ana] = statedLinesOf(saved.lines, saved.descriptions);
		const lines = [
			{ ...ana, hours: 12, amount: 960 },
			{ key: 'p3|cy', description: 'Cy Diaz', hours: 2, rate: 50, amount: 100 }
		];

		const changes = invoiceChangesOf(saved, figuresOf(saved, { lines }));

		expect(design.key).toBe('p2|bo');
		expect(changes).toMatchObject({ addedLines: 1, removedLines: 1, repricedLines: 1, rewrittenDescriptions: 0 });
		expect(hasInvoiceChanges(changes)).toBe(true);
	});

	it('tells a description rewritten from a line repriced', () => {
		const saved = readSaved();
		const lines = statedLinesOf(saved.lines, saved.descriptions).map((line) => ({
			...line,
			description: 'Support'
		}));

		const changes = invoiceChangesOf(saved, figuresOf(saved, { lines }));

		expect(changes).toMatchObject({ repricedLines: 0, rewrittenDescriptions: 2 });
	});

	it('states the total, dates, number, discount, tax, currency and note before and after', () => {
		const saved = readSaved();
		const draft = figuresOf(saved, {
			total: 1200,
			issueDay: '2026-11-02',
			dueDay: '2026-12-02',
			number: 43,
			discountPercent: null,
			taxPercent: 20,
			currency: 'EUR',
			note: 'Pay within 30 days.'
		});

		const changes = invoiceChangesOf(saved, draft);

		expect(changes).toMatchObject({
			total: { before: 1080, after: 1200 },
			issueDay: { before: '2026-11-01', after: '2026-11-02' },
			dueDay: { before: '2026-11-30', after: '2026-12-02' },
			number: { before: 42, after: 43 },
			discount: { before: 10, after: 0 },
			tax: null,
			currency: { before: 'USD', after: 'EUR' },
			isNoteRewritten: true
		});
	});

	it('sees no change in a total that differs by less than a cent', () => {
		const saved = readSaved();

		expect(invoiceChangesOf(saved, figuresOf(saved, { total: 1080.001 })).total).toBeNull();
	});
});

describe('whether an invoice read back holds the lines written', () => {
	const written: InvoiceItemRequest[] = [
		{
			description: 'Ana Lima',
			price: 80,
			quantity: 10,
			totalValue: 800,
			invoiceId: 'invoice-42',
			projectId: 'p1',
			employeeId: 'ana',
			applyTax: true,
			applyDiscount: false,
			organizationId: 'organization-1',
			tenantId: 'tenant-1'
		},
		{
			description: 'App',
			price: 100,
			quantity: 5,
			totalValue: 500,
			invoiceId: 'invoice-42',
			projectId: 'p2',
			applyTax: true,
			applyDiscount: false,
			organizationId: 'organization-1',
			tenantId: 'tenant-1'
		}
	];

	it('holds them in any order, the API answering its numbers as it stores them', () => {
		const readBack = [
			item({ description: 'App', projectId: 'p2', employeeId: null, price: 100, quantity: 5, totalValue: 500 }),
			item({ description: 'Ana Lima' })
		];

		expect(haveSameLines(readBack, written)).toBe(true);
	});

	it('does not hold them when one is missing or differs', () => {
		expect(haveSameLines([], written)).toBe(false);
		expect(haveSameLines([item({ description: 'Ana Lima' }), item({ projectId: 'p2' })], written)).toBe(false);
	});

	it('does not hold them when only a line’s tax or discount flag differs, a missing flag being off', () => {
		const app = item({
			description: 'App',
			projectId: 'p2',
			employeeId: null,
			price: 100,
			quantity: 5,
			totalValue: 500
		});
		const ana = item({ description: 'Ana Lima' });

		expect(haveSameLines([app, { ...ana, applyTax: false }], written)).toBe(false);
		expect(haveSameLines([app, { ...ana, applyDiscount: true }], written)).toBe(false);
		expect(haveSameLines([app, { ...ana, applyDiscount: null }], written)).toBe(true);
	});
});

describe('what the screen of a saved invoice shows while it reads it', () => {
	const ready = {
		hasOrganization: true,
		hasOrganizationFailed: false,
		isLoading: false,
		isMissing: false,
		isError: false,
		hasInvoice: true,
		isOfWorkspace: true,
		isReadable: true
	};

	it('waits for the workspace that dates the invoice, then for the invoice', () => {
		expect(savedInvoiceStatusOf({ ...ready, hasOrganization: false })).toBe('loading');
		expect(savedInvoiceStatusOf({ ...ready, hasOrganization: false, hasOrganizationFailed: true })).toBe(
			'workspaceError'
		);
		expect(savedInvoiceStatusOf({ ...ready, isLoading: true })).toBe('loading');
	});

	it('tells a missing invoice from a read that failed, and from one this screen did not make', () => {
		expect(savedInvoiceStatusOf({ ...ready, isMissing: true, isError: true })).toBe('missing');
		expect(savedInvoiceStatusOf({ ...ready, isError: true })).toBe('error');
		expect(savedInvoiceStatusOf({ ...ready, isReadable: false })).toBe('notFromTime');
		expect(savedInvoiceStatusOf(ready)).toBe('ready');
	});

	it('opens no invoice of another workspace, whatever it was made from', () => {
		expect(savedInvoiceStatusOf({ ...ready, isOfWorkspace: false })).toBe('otherWorkspace');
		expect(savedInvoiceStatusOf({ ...ready, isOfWorkspace: false, isReadable: false })).toBe('otherWorkspace');
	});
});

describe('whether an invoice read back belongs to the workspace it was read in', () => {
	const workspace = { organizationId: 'organization-1', tenantId: 'tenant-1' };

	it('belongs to it when it names the same organization and tenant', () => {
		expect(isInvoiceOfWorkspace(savedRaw(), workspace)).toBe(true);
	});

	it('does not when it names another organization of the tenant, or another tenant', () => {
		const otherOrganization = { ...workspace, organizationId: 'organization-2' };

		expect(isInvoiceOfWorkspace(savedRaw(), otherOrganization)).toBe(false);
		expect(isInvoiceOfWorkspace(savedRaw({ tenantId: 'tenant-2' }), workspace)).toBe(false);
	});

	it('does not while the invoice or the workspace is unknown', () => {
		expect(isInvoiceOfWorkspace(null, workspace)).toBe(false);
		expect(isInvoiceOfWorkspace(savedRaw(), null)).toBe(false);
	});
});

describe('whether an invoice read back states the fields an update writes', () => {
	it('states them when its number, dates, money and terms are the same, whatever the form of each', () => {
		const saved = readSaved();
		const readBack = { ...savedRaw(), invoiceDate: '2026-11-01T00:00:00+01:00', discountValue: 10.0 };

		expect(haveSameFields(readBack, saved.previous.update)).toBe(true);
	});

	it('does not state them once one of them changed', () => {
		const saved = readSaved();

		expect(haveSameFields({ ...savedRaw(), totalValue: 1200 }, saved.previous.update)).toBe(false);
		expect(haveSameFields({ ...savedRaw(), dueDate: '2026-12-15T22:59:59.999Z' }, saved.previous.update)).toBe(
			false
		);
		expect(
			haveSameFields(
				{ ...savedRaw(), terms: 'Billable time from 2026-10-01 to 2026-10-31' },
				saved.previous.update
			)
		).toBe(false);
	});
});

describe('a failed write that never reached the API', () => {
	function answeredWith(status: number) {
		return ApiErrorService.fromAxiosError({
			message: 'Request failed with status code ' + status,
			status,
			response: { data: {}, headers: {}, status, statusText: '' }
		});
	}

	it('is one that got no answer: the network, a timeout, the browser', () => {
		const lost = ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' });

		expect(didNotReachApi(lost)).toBe(true);
	});

	it.each([502, 504])('is one a gateway answered with %i in the API’s place', (status) => {
		expect(didNotReachApi(answeredWith(status))).toBe(true);
	});

	it.each([400, 500, 503])('is not one the API answered with %i', (status) => {
		expect(didNotReachApi(answeredWith(status))).toBe(false);
	});

	it('is not an error of another kind', () => {
		expect(didNotReachApi(new Error('unexpected'))).toBe(false);
	});
});

describe('the time a saved invoice bills', () => {
	const billed = new Map([
		['item-1', ['log-1', 'log-2']],
		['item-of-another-invoice', ['log-9']]
	]);

	it('is read through each line’s id on the invoice', () => {
		const saved = readSaved();

		expect([...saved.lineIds.entries()]).toEqual([
			['p1|ana', 'item-1'],
			['p2|bo', 'item-2']
		]);
		expect(saved.previousLineIds).toEqual(['item-1', 'item-2']);
		expect(billedLinesReadOf(saved)).toEqual({ lineIds: new Set(['item-1', 'item-2']), projectIds: ['p1', 'p2'] });
	});

	it('is named on each saved line, a line no time log names staying as it was saved', () => {
		const saved = readSaved();

		const lines = billedSavedLinesOf(saved, billed);

		expect(lines.map((line) => [line.key, line.timeLogIds])).toEqual([
			['p2|bo', undefined],
			['p1|ana', ['log-1', 'log-2']]
		]);
	});

	it('is written back with the lines when an edit fails half way, to an API that records it', () => {
		const saved = readSaved();

		const previous = billedPreviousOf(saved, billed, true);

		expect(previous.lines.map((line) => line.timeLogIds)).toEqual([['log-1', 'log-2'], undefined]);
		expect(previous.update).toBe(saved.previous.update);
	});

	it('is not named on the lines written back to an API that does not record it', () => {
		const saved = readSaved();

		expect(billedPreviousOf(saved, billed, false)).toBe(saved.previous);
	});

	it('is not read for an invoice that has none to name', () => {
		expect(billedLinesReadOf(null)).toEqual({ lineIds: new Set(), projectIds: [] });
	});
});

describe('an invoice saved before the time its lines bill was recorded', () => {
	const billed = new Map([['item-1', ['log-1', 'log-2']]]);

	it('bills time no saved line records when one of its lines names a log the invoice does not record yet', () => {
		expect(billsUnrecordedTimeOf([{ timeLogIds: ['log-1', 'log-3'] }], billed)).toBe(true);
	});

	it('bills no such time when every log its lines name is recorded, or when they name none', () => {
		expect(billsUnrecordedTimeOf([{ timeLogIds: ['log-2', 'log-1'] }], billed)).toBe(false);
		expect(billsUnrecordedTimeOf([{}], new Map())).toBe(false);
	});

	it('counts the recording of that time as a change of its own, with the same figures', () => {
		const saved = readSaved();

		const changes = invoiceChangesOf(saved, figuresOf(saved, { billsUnrecordedTime: true }));

		expect(changes.recordsBilledTime).toBe(true);
		expect(hasInvoiceChanges(changes)).toBe(true);
	});
});

describe('the lines an invoice holds when its edit is saved', () => {
	it('are the ones the editor opened when their ids are the same, in any order', () => {
		expect(haveSameLineIds([{ id: 'item-2' }, { id: 'item-1' }], ['item-1', 'item-2'])).toBe(true);
	});

	it('are not once they were written back under new ids, or another line was added', () => {
		expect(haveSameLineIds([{ id: 'item-9' }, { id: 'item-2' }], ['item-1', 'item-2'])).toBe(false);
		expect(haveSameLineIds([{ id: 'item-1' }], ['item-1', 'item-2'])).toBe(false);
	});
});
