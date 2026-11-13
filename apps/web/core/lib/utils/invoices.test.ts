import {
	billableEntriesOf,
	buildInvoiceRequest,
	dueDayAfter,
	hoursOfLines,
	invoiceCurrenciesOf,
	invoiceCurrencyKeyOf,
	invoiceDayOf,
	invoiceDueTermOf,
	invoiceMonthGroupsOf,
	invoicePeriodOfTerms,
	invoiceProblemsOf,
	invoiceStatusOf,
	invoiceStatusToneOf,
	invoiceTermsOf,
	invoiceSaveFailureOf,
	invoiceTimeOf,
	invoiceWaitsOf,
	keptLinesOf,
	lineAmountOf,
	lineDescriptionOf,
	linePriceOf,
	namedLinesOf,
	nextInvoiceNumberOf,
	overlappingInvoicesOf,
	parseInvoiceNumber,
	periodsOverlap,
	projectGroupsOf,
	removedLineCountOf,
	STANDARD_DUE_DAYS,
	type BillableEntry,
	type BillableLogLike,
	type InvoiceLineNames,
	type LinePrice
} from './invoices';
import { invoiceTotalsOf } from './invoice-totals';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const HOUR = 3600;

function log(extra: Partial<BillableLogLike> = {}): BillableLogLike {
	return { projectId: 'p1', employeeId: 'ana', taskId: 't1', isBillable: true, duration: HOUR, ...extra };
}

const names: InvoiceLineNames = {
	projectNames: new Map([
		['p1', 'Website'],
		['p2', 'App']
	]),
	memberNames: new Map([
		['ana', 'Ana Lima'],
		['bo', 'Bo Chen']
	]),
	taskTitles: new Map([['t1', '#12 Fix login']]),
	unnamedProject: 'Unnamed project',
	unnamedMember: 'Unnamed member',
	noTask: 'No task'
};

function flatPrice(rate: number | null, currency: string | null = 'USD'): () => LinePrice {
	if (rate === null) {
		return () => ({ rate: null, currency: null, source: null });
	}
	return () => ({ rate, currency, source: 'project' });
}

describe('billableEntriesOf', () => {
	const clientProjects = new Set(['p1', 'p2']);

	it('never takes non-billable time, nor time whose billable flag is not stated', () => {
		const logs = [log(), log({ isBillable: false }), log({ isBillable: null }), log({ isBillable: undefined })];

		const entries = billableEntriesOf(logs, clientProjects);

		expect(entries).toEqual([{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: HOUR }]);
	});

	it('leaves out the time of another client’s project and time without a project', () => {
		const logs = [log({ projectId: 'other' }), log({ projectId: null }), log({ projectId: 'p2' })];

		const entries = billableEntriesOf(logs, clientProjects);

		expect(entries.map((entry) => entry.projectId)).toEqual(['p2']);
	});

	it('adds the logs of one member on one task of one project', () => {
		const logs = [log(), log({ duration: 1800 }), log({ taskId: null }), log({ employeeId: 'bo' })];

		const entries = billableEntriesOf(logs, clientProjects);

		expect(entries).toEqual([
			{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: 5400 },
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: 't1', seconds: HOUR }
		]);
	});

	it('reads the length of a log from its start and end when the API sends no duration', () => {
		const timed = log({
			duration: undefined,
			startedAt: '2026-10-05T08:00:00.000Z',
			stoppedAt: '2026-10-05T09:30:00.000Z'
		});

		expect(billableEntriesOf([timed], clientProjects)[0].seconds).toBe(5400);
	});

	it('drops a log without any length', () => {
		const logs = [log({ duration: 0 }), log({ duration: undefined })];

		expect(billableEntriesOf(logs, clientProjects)).toEqual([]);
	});
});

describe('linePriceOf', () => {
	const projectRates = {
		billRateValue: '80.00',
		currency: 'EUR',
		members: [{ employeeId: 'ana', billRateValue: 95 }]
	};
	const employeeRate = { billRateValue: 40, billRateCurrency: 'USD' };

	it('prices a member at their client rate on the project first, in the project’s currency', () => {
		const price = linePriceOf({
			employeeId: 'ana',
			projectRates,
			projectCurrency: 'EUR',
			employeeRate,
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: 95, currency: 'EUR', source: 'member' });
	});

	it('falls back on the project’s client rate', () => {
		const price = linePriceOf({
			employeeId: 'bo',
			projectRates,
			projectCurrency: null,
			employeeRate,
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: 80, currency: 'EUR', source: 'project' });
	});

	it('falls back on the member’s own billing rate, in their own currency', () => {
		const price = linePriceOf({
			employeeId: 'bo',
			projectRates: { billRateValue: null, currency: 'EUR', members: [] },
			projectCurrency: 'EUR',
			employeeRate,
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: 40, currency: 'USD', source: 'employee' });
	});

	it('uses the member’s own rate when the client rates cannot be read', () => {
		const price = linePriceOf({
			employeeId: 'ana',
			projectRates: null,
			projectCurrency: 'EUR',
			employeeRate: { billRateValue: 40, billRateCurrency: null },
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: 40, currency: 'GBP', source: 'employee' });
	});

	it('reads a cleared billing rate, stored as zero, as no rate', () => {
		const price = linePriceOf({
			employeeId: 'bo',
			projectRates: null,
			projectCurrency: null,
			employeeRate: { billRateValue: 0, billRateCurrency: 'USD' },
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: null, currency: null, source: null });
	});

	it('keeps a client rate set to zero: that time is billed nothing', () => {
		const price = linePriceOf({
			employeeId: 'bo',
			projectRates: { billRateValue: 0, currency: 'EUR', members: [] },
			projectCurrency: 'EUR',
			employeeRate,
			organizationCurrency: 'GBP'
		});

		expect(price).toEqual({ rate: 0, currency: 'EUR', source: 'project' });
	});
});

describe('invoiceTimeOf', () => {
	const entries: BillableEntry[] = [
		{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: 6 * HOUR },
		{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 4 * HOUR }
	];

	it('bills ten billable hours at one rate ten times that rate', () => {
		const time = invoiceTimeOf({ entries, grouping: 'member', priceOf: flatPrice(80) });

		expect(time.lines).toHaveLength(1);
		expect(time.lines[0]).toMatchObject({ key: 'p1|ana', hours: 10, rate: 80, amount: 800, taskId: null });
		expect(invoiceCurrenciesOf(time.lines)[0].amount).toBe(800);
	});

	it('keeps one line per task of a member when grouped by task', () => {
		const time = invoiceTimeOf({ entries, grouping: 'task', priceOf: flatPrice(80) });

		expect(time.lines.map((line) => [line.key, line.hours, line.amount])).toEqual([
			['p1|ana|t1', 6, 480],
			['p1|ana|', 4, 320]
		]);
	});

	it('states the amount as the hours shown times the rate', () => {
		const odd: BillableEntry[] = [{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 10 * HOUR + 1200 }];

		const [line] = invoiceTimeOf({ entries: odd, grouping: 'member', priceOf: flatPrice(80) }).lines;

		expect(line.hours).toBe(10.33);
		expect(line.amount).toBe(826.4);
	});

	it('lists time without any rate apart, per project and member, and prices none of it', () => {
		const time = invoiceTimeOf({ entries, grouping: 'task', priceOf: flatPrice(null) });

		expect(time.lines).toEqual([]);
		expect(time.unpriced).toEqual([{ key: 'p1|ana', projectId: 'p1', employeeId: 'ana', seconds: 10 * HOUR }]);
	});

	it('adds up the hours its lines state, so the sum a reader makes is the one shown', () => {
		const thirds: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 1200 },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 1200 },
			{ projectId: 'p2', employeeId: 'ana', taskId: null, seconds: 1200 }
		];

		const { lines } = invoiceTimeOf({ entries: thirds, grouping: 'member', priceOf: flatPrice(90) });

		expect(lines.map((line) => line.hours)).toEqual([0.33, 0.33, 0.33]);
		expect(hoursOfLines(lines)).toBe(0.99);
		expect(invoiceCurrenciesOf(lines)[0]).toMatchObject({ hours: 0.99, amount: 89.1, lineCount: 3 });
	});

	it('makes no line of time too short to state a hundredth of an hour', () => {
		const brief: BillableEntry[] = [{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 10 }];

		expect(invoiceTimeOf({ entries: brief, grouping: 'member', priceOf: flatPrice(80) }).lines).toEqual([]);
	});
});

describe('lines by project', () => {
	function priceByMember(rates: Record<string, number>, currency = 'USD') {
		return (_projectId: string, employeeId: string): LinePrice => {
			const rate = rates[employeeId] ?? null;
			if (rate === null) {
				return { rate: null, currency: null, source: null };
			}
			return { rate, currency, source: 'member' };
		};
	}

	it('gives 10 h at 80 and 6 h at 40 one line of 16 h at 65.00, an average rate, for 1,040.00', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: 6 * HOUR },
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 4 * HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 6 * HOUR }
		];

		const { lines } = invoiceTimeOf({ entries, grouping: 'project', priceOf: priceByMember({ ana: 80, bo: 40 }) });

		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			projectId: 'p1',
			employeeId: null,
			taskId: null,
			hours: 16,
			rate: 65,
			amount: 1040,
			isAverageRate: true
		});
	});

	it('rounds the average rate to the cent and bills the hours at that rate', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 10 * HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 5 * HOUR }
		];

		const [line] = invoiceTimeOf({
			entries,
			grouping: 'project',
			priceOf: priceByMember({ ana: 80, bo: 45 })
		}).lines;

		expect(line).toMatchObject({ hours: 15, rate: 68.33, amount: 1024.95 });
	});

	it('rounds a half-cent average rate up and bills the hours at it (an hour at 10.00 and one at 10.01)', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: HOUR }
		];
		const priceOf = priceByMember({ ana: 10, bo: 10.01 });

		const [line] = invoiceTimeOf({ entries, grouping: 'project', priceOf }).lines;

		expect(line).toMatchObject({ hours: 2, rate: 10.01, amount: 20.02, isAverageRate: true });
	});

	it('rounds a project line’s amount half a cent up, as a member’s line does (1.15 h at 12.50 is 14.38)', () => {
		const entries: BillableEntry[] = [{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 4140 }];

		const [line] = invoiceTimeOf({ entries, grouping: 'project', priceOf: priceByMember({ ana: 12.5 }) }).lines;

		expect(line).toMatchObject({ hours: 1.15, rate: 12.5, amount: 14.38 });
	});

	it('states the members’ own rate, not an average, when they are all billed the same', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 1200 },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 1200 }
		];

		const [line] = invoiceTimeOf({
			entries,
			grouping: 'project',
			priceOf: priceByMember({ ana: 90, bo: 90 })
		}).lines;

		expect(line).toMatchObject({ hours: 0.67, rate: 90, amount: 60.3, isAverageRate: false, rateSource: 'member' });
	});

	it('puts the time of one project priced in two currencies on two lines', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 2 * HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 3 * HOUR }
		];
		function priceInTwoCurrencies(_projectId: string, employeeId: string): LinePrice {
			if (employeeId === 'ana') {
				return { rate: 100, currency: 'USD', source: 'member' };
			}
			return { rate: 50, currency: 'EUR', source: 'employee' };
		}

		const { lines } = invoiceTimeOf({ entries, grouping: 'project', priceOf: priceInTwoCurrencies });

		expect(lines.map((line) => [line.currency, line.hours, line.amount, line.isAverageRate])).toEqual([
			['USD', 2, 200, false],
			['EUR', 3, 150, false]
		]);
	});

	it('lists the time without a rate apart, per member, and leaves it out of the project’s line', () => {
		const entries: BillableEntry[] = [
			{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 2 * HOUR },
			{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: HOUR }
		];

		const time = invoiceTimeOf({ entries, grouping: 'project', priceOf: priceByMember({ ana: 80 }) });

		expect(time.lines.map((line) => [line.hours, line.amount])).toEqual([[2, 160]]);
		expect(time.unpriced).toEqual([{ key: 'p1|bo', projectId: 'p1', employeeId: 'bo', seconds: HOUR }]);
	});

	it('names a project line after its project, and saves it without a member', () => {
		const entries: BillableEntry[] = [{ projectId: 'p2', employeeId: 'ana', taskId: null, seconds: HOUR }];
		const { lines } = invoiceTimeOf({ entries, grouping: 'project', priceOf: priceByMember({ ana: 80 }) });
		const named = namedLinesOf(lines, 'project', names);

		const request = buildInvoiceRequest({
			id: 'inv-1',
			organizationId: 'org-1',
			tenantId: 'tenant-1',
			clientId: 'c1',
			invoiceNumber: 7,
			issueDay: '2026-11-02',
			dueDay: '2026-12-02',
			currency: 'USD',
			period: { fromDay: '2026-10-01', toDay: '2026-10-31' },
			timeZone: 'UTC',
			lines: named,
			descriptions: new Map()
		});

		expect(named.map((line) => [line.label, line.memberName])).toEqual([['App', '']]);
		expect(request.invoiceItems[0]).toMatchObject({ description: 'App', projectId: 'p2', quantity: 1, price: 80 });
		expect(request.invoiceItems[0]).not.toHaveProperty('employeeId');
	});
});

describe('invoice currencies', () => {
	const mixed: BillableEntry[] = [
		{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 2 * HOUR },
		{ projectId: 'p2', employeeId: 'bo', taskId: null, seconds: 5 * HOUR }
	];

	function priceByProject(projectId: string): LinePrice {
		if (projectId === 'p1') {
			return { rate: 100, currency: 'USD', source: 'project' };
		}
		return { rate: 50, currency: 'EUR', source: 'project' };
	}

	const { lines } = invoiceTimeOf({ entries: mixed, grouping: 'member', priceOf: priceByProject });

	it('never adds two currencies: one total each, the one pricing the most time first', () => {
		const currencies = invoiceCurrenciesOf(lines);

		expect(currencies.map((total) => [total.currency, total.amount, total.hours, total.lineCount])).toEqual([
			['EUR', 250, 5, 1],
			['USD', 200, 2, 1]
		]);
	});

	it('starts on the currency pricing the most time and keeps a picked one that is still there', () => {
		const currencies = invoiceCurrenciesOf(lines);

		expect(invoiceCurrencyKeyOf(currencies, null)).toBe('EUR');
		expect(invoiceCurrencyKeyOf(currencies, 'USD')).toBe('USD');
		expect(invoiceCurrencyKeyOf(currencies, 'GBP')).toBe('EUR');
		expect(invoiceCurrencyKeyOf([], 'USD')).toBeNull();
	});

	it('builds the invoice of one currency without the lines of another', () => {
		const named = namedLinesOf(lines, 'member', names);

		const request = buildInvoiceRequest({
			id: 'inv-1',
			organizationId: 'org-1',
			tenantId: 'tenant-1',
			clientId: 'c1',
			invoiceNumber: 7,
			issueDay: '2026-11-02',
			dueDay: '2026-12-02',
			currency: 'USD',
			period: { fromDay: '2026-10-01', toDay: '2026-10-31' },
			timeZone: 'UTC',
			lines: named,
			descriptions: new Map()
		});

		expect(request.totalValue).toBe(200);
		expect(request.invoiceItems).toHaveLength(1);
		expect(request.invoiceItems[0]).toMatchObject({ projectId: 'p1', price: 100, quantity: 2, totalValue: 200 });
	});
});

describe('line names and edits', () => {
	const entries: BillableEntry[] = [
		{ projectId: 'p1', employeeId: 'bo', taskId: 't1', seconds: HOUR },
		{ projectId: 'p2', employeeId: 'ana', taskId: null, seconds: HOUR },
		{ projectId: 'p1', employeeId: 'ana', taskId: 'gone', seconds: HOUR }
	];

	it('names a member line after the member and sorts by project, then by line', () => {
		const { lines } = invoiceTimeOf({ entries, grouping: 'member', priceOf: flatPrice(80) });

		const named = namedLinesOf(lines, 'member', names);

		expect(named.map((line) => [line.projectName, line.label])).toEqual([
			['App', 'Ana Lima'],
			['Website', 'Ana Lima'],
			['Website', 'Bo Chen']
		]);
	});

	it('names a task line after its task and its member, and says when the time has no task', () => {
		const { lines } = invoiceTimeOf({ entries, grouping: 'task', priceOf: flatPrice(80) });

		const named = namedLinesOf(lines, 'task', names);

		expect(named.map((line) => line.label)).toEqual([
			'No task · Ana Lima',
			'#12 Fix login · Bo Chen',
			'No task · Ana Lima'
		]);
	});

	it('groups the lines by project with a subtotal each', () => {
		const { lines } = invoiceTimeOf({ entries, grouping: 'member', priceOf: flatPrice(80) });

		const groups = projectGroupsOf(namedLinesOf(lines, 'member', names));

		expect(groups.map((group) => [group.projectName, group.lines.length, group.hours, group.amount])).toEqual([
			['App', 1, 1, 80],
			['Website', 2, 2, 160]
		]);
	});

	it('keeps the lines that were not removed and counts the removed ones', () => {
		const { lines } = invoiceTimeOf({ entries, grouping: 'member', priceOf: flatPrice(80) });
		const removed = new Set(['p1|bo', 'not-a-line']);

		expect(keptLinesOf(lines, removed).map((line) => line.key)).toEqual(['p2|ana', 'p1|ana']);
		expect(removedLineCountOf(lines, removed)).toBe(1);
	});

	it('states what the user wrote, and the line’s own label when the field is left empty', () => {
		const { lines } = invoiceTimeOf({ entries, grouping: 'member', priceOf: flatPrice(80) });
		const [line] = namedLinesOf(lines, 'member', names);

		expect(lineDescriptionOf(line, new Map([[line.key, '  Design sprint  ']]))).toBe('Design sprint');
		expect(lineDescriptionOf(line, new Map([[line.key, '   ']]))).toBe('Ana Lima');
		expect(lineDescriptionOf(line, new Map())).toBe('Ana Lima');
	});
});

describe('buildInvoiceRequest', () => {
	const entries: BillableEntry[] = [
		{ projectId: 'p1', employeeId: 'ana', taskId: 't1', seconds: 90 * 60 },
		{ projectId: 'p1', employeeId: 'bo', taskId: null, seconds: 2 * HOUR }
	];
	const { lines } = invoiceTimeOf({ entries, grouping: 'task', priceOf: flatPrice(80, 'EUR') });
	const named = namedLinesOf(lines, 'task', names);

	const request = buildInvoiceRequest({
		id: 'inv-1',
		organizationId: 'org-1',
		tenantId: 'tenant-1',
		clientId: 'c1',
		invoiceNumber: 13,
		issueDay: '2026-11-02',
		dueDay: '2026-12-02',
		currency: 'EUR',
		period: { fromDay: '2026-10-01', toDay: '2026-10-31' },
		timeZone: 'Europe/Paris',
		lines: named,
		descriptions: new Map([['p1|bo|', 'Workshop']])
	});

	it('creates a draft invoice for the client, numbered and dated, with no tax and no discount', () => {
		expect(request).toMatchObject({
			id: 'inv-1',
			invoiceNumber: 13,
			currency: 'EUR',
			status: 'DRAFT',
			isEstimate: false,
			paid: false,
			invoiceType: 'BY_PROJECT_HOURS',
			organizationContactId: 'c1',
			toContactId: 'c1',
			fromOrganizationId: 'org-1',
			organizationId: 'org-1',
			tenantId: 'tenant-1',
			tax: 0,
			tax2: 0,
			discountValue: 0,
			totalValue: 280
		});
	});

	it('dates the invoice on the days picked, in the organization’s time zone', () => {
		expect(request.invoiceDate).toBe('2026-11-01T23:00:00.000Z');
		expect(request.dueDate).toBe('2026-12-02T22:59:59.999Z');
	});

	it('states the billed period in the terms', () => {
		expect(request.terms).toBe('Billable time from 2026-10-01 to 2026-10-31');
	});

	it('sends each line with its hours, rate, amount, project, member and task', () => {
		expect(request.invoiceItems).toEqual([
			{
				description: '#12 Fix login · Ana Lima',
				price: 80,
				quantity: 1.5,
				totalValue: 120,
				invoiceId: 'inv-1',
				projectId: 'p1',
				employeeId: 'ana',
				taskId: 't1',
				applyTax: false,
				applyDiscount: false,
				organizationId: 'org-1',
				tenantId: 'tenant-1'
			},
			{
				description: 'Workshop',
				price: 80,
				quantity: 2,
				totalValue: 160,
				invoiceId: 'inv-1',
				projectId: 'p1',
				employeeId: 'bo',
				applyTax: false,
				applyDiscount: false,
				organizationId: 'org-1',
				tenantId: 'tenant-1'
			}
		]);
	});

	it('saves a 10 % discount and a 20 % tax on 1,000.00 with the total shown, 1,080.00', () => {
		const tenHours: BillableEntry[] = [{ projectId: 'p1', employeeId: 'ana', taskId: null, seconds: 10 * HOUR }];
		const priced = invoiceTimeOf({ entries: tenHours, grouping: 'member', priceOf: flatPrice(100, 'EUR') });
		const subtotal = invoiceCurrenciesOf(priced.lines)[0].amount;
		const adjustments = { discountPercent: 10, taxPercent: 20 };

		const adjusted = buildInvoiceRequest({
			id: 'inv-2',
			organizationId: 'org-1',
			tenantId: 'tenant-1',
			clientId: 'c1',
			invoiceNumber: 14,
			issueDay: '2026-11-02',
			dueDay: '2026-12-02',
			currency: 'EUR',
			period: { fromDay: '2026-10-01', toDay: '2026-10-31' },
			timeZone: 'Europe/Paris',
			lines: namedLinesOf(priced.lines, 'member', names),
			descriptions: new Map(),
			adjustments
		});

		expect(adjusted).toMatchObject({ discountValue: 10, discountType: 'PERCENT', tax: 20, taxType: 'PERCENT' });
		expect(adjusted.totalValue).toBe(1080);
		expect(adjusted.totalValue).toBe(invoiceTotalsOf(subtotal, adjustments).total);
		expect(adjusted.invoiceItems[0]).toMatchObject({ totalValue: 1000, applyTax: true, applyDiscount: true });
	});
});

describe('the period an invoice states', () => {
	const october = { fromDay: '2026-10-01', toDay: '2026-10-31' };

	it('reads back the period written in the terms', () => {
		expect(invoicePeriodOfTerms(invoiceTermsOf(october))).toEqual(october);
		expect(invoicePeriodOfTerms(`${invoiceTermsOf(october)}\nNet 30`)).toEqual(october);
	});

	it('writes the note to the client after the period, which stays first and is still read back', () => {
		const terms = invoiceTermsOf(october, '  Payment by bank transfer.\nThank you.  ');

		expect(terms).toBe('Billable time from 2026-10-01 to 2026-10-31\n\nPayment by bank transfer.\nThank you.');
		expect(invoicePeriodOfTerms(terms)).toEqual(october);
		expect(invoiceTermsOf(october, '   ')).toBe('Billable time from 2026-10-01 to 2026-10-31');
	});

	it('saves the note in the invoice’s terms', () => {
		const request = buildInvoiceRequest({
			id: 'inv-3',
			organizationId: 'org-1',
			tenantId: 'tenant-1',
			clientId: 'c1',
			invoiceNumber: 15,
			issueDay: '2026-11-02',
			dueDay: '2026-12-02',
			currency: 'USD',
			period: october,
			timeZone: 'UTC',
			lines: [],
			descriptions: new Map(),
			note: 'Net 14'
		});

		expect(request.terms).toBe('Billable time from 2026-10-01 to 2026-10-31\n\nNet 14');
	});

	it('states no period for terms written elsewhere, or for days that do not exist', () => {
		expect(invoicePeriodOfTerms('Net 30')).toBeNull();
		expect(invoicePeriodOfTerms(null)).toBeNull();
		expect(invoicePeriodOfTerms('Billable time from 2026-02-30 to 2026-03-01')).toBeNull();
		expect(invoicePeriodOfTerms('Billable time from 2026-10-31 to 2026-10-01')).toBeNull();
	});

	it('finds the periods that share a day', () => {
		expect(periodsOverlap(october, { fromDay: '2026-10-31', toDay: '2026-11-15' })).toBe(true);
		expect(periodsOverlap(october, { fromDay: '2026-09-01', toDay: '2026-10-01' })).toBe(true);
		expect(periodsOverlap(october, { fromDay: '2026-11-01', toDay: '2026-11-30' })).toBe(false);
	});

	it('keeps the saved invoices whose stated period overlaps, never one that states none', () => {
		const invoices = [
			{ id: 'a', terms: invoiceTermsOf(october) },
			{ id: 'b', terms: 'Net 30' },
			{ id: 'c', terms: invoiceTermsOf({ fromDay: '2026-11-01', toDay: '2026-11-30' }) },
			{ id: 'd', terms: null }
		];

		const overlapping = overlappingInvoicesOf(invoices, { fromDay: '2026-10-15', toDay: '2026-10-20' });

		expect(overlapping.map((invoice) => invoice.id)).toEqual(['a']);
	});

	it('leaves out a void invoice: it billed nothing, so its period cannot be billed twice', () => {
		const invoices = [
			{ id: 'sent', terms: invoiceTermsOf(october), status: 'SENT' },
			{ id: 'void', terms: invoiceTermsOf(october), status: 'VOID' },
			{ id: 'void-lower-case', terms: invoiceTermsOf(october), status: 'void' }
		];

		const overlapping = overlappingInvoicesOf(invoices, { fromDay: '2026-10-15', toDay: '2026-10-20' });

		expect(overlapping.map((invoice) => invoice.id)).toEqual(['sent']);
	});
});

describe('invoice number and dates', () => {
	it('takes a whole number from 1 and nothing else', () => {
		expect(parseInvoiceNumber(' 13 ')).toBe(13);
		expect(parseInvoiceNumber('0')).toBeNull();
		expect(parseInvoiceNumber('1.5')).toBeNull();
		expect(parseInvoiceNumber('-3')).toBeNull();
		expect(parseInvoiceNumber('INV-4')).toBeNull();
		expect(parseInvoiceNumber('')).toBeNull();
	});

	it('proposes the number after the highest one the API holds, and none when it is unknown', () => {
		expect(nextInvoiceNumberOf('12')).toBe(13);
		expect(nextInvoiceNumberOf(0)).toBe(1);
		expect(nextInvoiceNumberOf(undefined)).toBeNull();
		expect(nextInvoiceNumberOf('abc')).toBeNull();
	});

	it('dues the invoice of a client with 14-day terms 14 days after its issue', () => {
		const term = invoiceDueTermOf(14, 30);

		expect(term).toEqual({ source: 'client', days: 14 });
		expect(dueDayAfter('2026-11-02', term.days)).toBe('2026-11-16');
	});

	it('reads a client’s terms of zero days as due on receipt', () => {
		const term = invoiceDueTermOf(0, 30);

		expect(term).toEqual({ source: 'client', days: 0 });
		expect(dueDayAfter('2026-11-02', term.days)).toBe('2026-11-02');
	});

	it('falls back on the organization’s setting, then on thirty days', () => {
		expect(invoiceDueTermOf(null, 45)).toEqual({ source: 'organization', days: 45 });
		expect(invoiceDueTermOf(-3, 10)).toEqual({ source: 'organization', days: 10 });
		expect(invoiceDueTermOf(undefined, 0)).toEqual({ source: 'standard', days: STANDARD_DUE_DAYS });
		expect(invoiceDueTermOf(14.5, null)).toEqual({ source: 'standard', days: 30 });
	});

	it('counts the due day across months and years, and none from an issue day that is not a day', () => {
		expect(dueDayAfter('2026-12-15', 30)).toBe('2027-01-14');
		expect(dueDayAfter('', 14)).toBe('');
		expect(dueDayAfter('2026-02-30', 14)).toBe('');
	});

	it('names what keeps an invoice from being saved', () => {
		const ready = { numberText: '13', issueDay: '2026-11-02', dueDay: '2026-12-02', currency: 'USD', lineCount: 2 };

		expect(invoiceProblemsOf(ready)).toEqual([]);
		expect(invoiceProblemsOf({ ...ready, lineCount: 0 })).toEqual(['noLines']);
		expect(invoiceProblemsOf({ ...ready, currency: null })).toEqual(['noCurrency']);
		expect(invoiceProblemsOf({ ...ready, numberText: '' })).toEqual(['number']);
		expect(invoiceProblemsOf({ ...ready, issueDay: '', dueDay: '' })).toEqual(['issueDay', 'dueDay']);
		expect(invoiceProblemsOf({ ...ready, dueDay: '2026-11-01' })).toEqual(['dueBeforeIssue']);
	});

	it('names the reads a save waits for', () => {
		const settled = { isReadingEarlier: false, isReadingTimeAgain: false };

		expect(invoiceWaitsOf(settled)).toEqual([]);
		expect(invoiceWaitsOf({ ...settled, isReadingEarlier: true })).toEqual(['readingEarlier']);
		expect(invoiceWaitsOf({ ...settled, isReadingTimeAgain: true })).toEqual(['readingTime']);
	});

	it('tells a save the API refused from one whose outcome is unknown', () => {
		const answered = (status: number) =>
			ApiErrorService.fromAxiosError({
				message: `Request failed with status code ${status}`,
				status,
				response: { data: {}, headers: {}, status, statusText: 'Error' }
			});
		const unanswered = (code: string) => ApiErrorService.fromAxiosError({ code, message: code });

		expect(invoiceSaveFailureOf(answered(400))).toBe('refused');
		expect(invoiceSaveFailureOf(answered(403))).toBe('refused');
		expect(invoiceSaveFailureOf(answered(500))).toBe('unconfirmed');
		expect(invoiceSaveFailureOf(answered(502))).toBe('unconfirmed');
		expect(invoiceSaveFailureOf(answered(504))).toBe('unconfirmed');
		// The browser's own timeout is reported as a 408 that no server sent
		expect(invoiceSaveFailureOf(unanswered('ECONNABORTED'))).toBe('unconfirmed');
		expect(invoiceSaveFailureOf(unanswered('ERR_NETWORK'))).toBe('unconfirmed');
		expect(invoiceSaveFailureOf(new Error('createInvoice API response did not match'))).toBe('unconfirmed');
	});

	it('reads the day of an invoice date in the organization’s zone', () => {
		expect(invoiceDayOf('2026-11-01T23:00:00.000Z', 'Europe/Paris')).toBe('2026-11-02');
		expect(invoiceDayOf('2026-11-01T23:00:00.000Z', 'UTC')).toBe('2026-11-01');
		expect(invoiceDayOf(null, 'UTC')).toBeNull();
		expect(invoiceDayOf('not a date', 'UTC')).toBeNull();
	});
});

describe('invoice list', () => {
	it('knows the API’s invoice statuses and nothing else', () => {
		expect(invoiceStatusOf('draft')).toBe('DRAFT');
		expect(invoiceStatusOf(' FULLY_PAID ')).toBe('FULLY_PAID');
		expect(invoiceStatusOf('ACCEPTED')).toBeNull();
		expect(invoiceStatusOf(null)).toBeNull();
	});

	it('gives each status its tone', () => {
		expect(invoiceStatusToneOf('FULLY_PAID')).toBe('success');
		expect(invoiceStatusToneOf('PARTIALLY_PAID')).toBe('warning');
		expect(invoiceStatusToneOf('SENT')).toBe('info');
		expect(invoiceStatusToneOf(null)).toBe('neutral');
	});

	it('gathers the invoices under their issue month, in the order they came', () => {
		const invoices = [
			{ id: 'a', invoiceDate: '2026-11-10T00:00:00.000Z' },
			{ id: 'b', invoiceDate: '2026-11-02T00:00:00.000Z' },
			{ id: 'c', invoiceDate: '2026-10-31T23:30:00.000Z' },
			{ id: 'd', invoiceDate: null }
		];

		const groups = invoiceMonthGroupsOf(invoices, 'Europe/Paris');

		expect(groups.map((group) => [group.key, group.invoices.map((invoice) => invoice.id)])).toEqual([
			['2026-11', ['a', 'b', 'c']],
			['', ['d']]
		]);
	});
});

describe('the amount of an invoice line', () => {
	it('rounds half a cent up, whatever the binary error of hours times rate', () => {
		expect(lineAmountOf(1.15, 12.5)).toBe(14.38);
		expect(lineAmountOf(2, 45)).toBe(90);
		expect(lineAmountOf(0.01, 0.5)).toBe(0.01);
	});
});
