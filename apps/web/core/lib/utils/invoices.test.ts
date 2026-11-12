import {
	billableEntriesOf,
	buildInvoiceRequest,
	defaultDueDayOf,
	hoursOfLines,
	invoiceCurrenciesOf,
	invoiceCurrencyKeyOf,
	invoiceDayOf,
	invoiceMonthGroupsOf,
	invoicePeriodOfTerms,
	invoiceProblemsOf,
	invoiceStatusOf,
	invoiceStatusToneOf,
	invoiceTermsOf,
	invoiceTimeOf,
	keptLinesOf,
	lineDescriptionOf,
	linePriceOf,
	namedLinesOf,
	nextInvoiceNumberOf,
	overlappingInvoicesOf,
	parseInvoiceNumber,
	periodsOverlap,
	projectGroupsOf,
	removedLineCountOf,
	type BillableEntry,
	type BillableLogLike,
	type InvoiceLineNames,
	type LinePrice
} from './invoices';

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
});

describe('the period an invoice states', () => {
	const october = { fromDay: '2026-10-01', toDay: '2026-10-31' };

	it('reads back the period written in the terms', () => {
		expect(invoicePeriodOfTerms(invoiceTermsOf(october))).toEqual(october);
		expect(invoicePeriodOfTerms(`${invoiceTermsOf(october)}\nNet 30`)).toEqual(october);
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

	it('takes the due day from the organization’s setting, and leaves it to the user without one', () => {
		expect(defaultDueDayOf('2026-11-02', 30)).toBe('2026-12-02');
		expect(defaultDueDayOf('2026-11-02', null)).toBe('');
		expect(defaultDueDayOf('2026-11-02', 0)).toBe('');
		expect(defaultDueDayOf('', 30)).toBe('');
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
