import type { TOwedReportDay } from '@/core/types/schemas/timer/time-log-reports.schema';
import {
	currencyRankOf,
	memberGroupsOf,
	owedFiguresOf,
	owedLinesOf,
	owedNoteKeyOf,
	payLineEmployeeIdsOf,
	rateShownOf,
	type PaymentsMember
} from './payments-due';

type Entry = TOwedReportDay['employees'][number];

function entry(employeeId: string, seconds: number, amount: number, extra: Partial<Entry> = {}): Entry {
	return {
		employee: { id: employeeId, billRateValue: 80, billRateCurrency: 'USD', user: { name: employeeId } },
		duration: seconds,
		amount,
		...extra
	};
}

function linesOf(
	days: Array<{ date: string; employees: Entry[] }>,
	readsPayRates = true,
	knownPayRates: ReadonlyMap<string, number> = new Map(),
	pendingPayRates: ReadonlySet<string> = new Set()
) {
	return owedLinesOf({
		report: days,
		members: new Map<string, PaymentsMember>(),
		organizationCurrency: 'EUR',
		unnamedLabel: 'Unnamed',
		readsPayRates,
		knownPayRates,
		pendingPayRates
	});
}

describe('owedLinesOf', () => {
	it('prices a line as before when the server does not say which rate priced it', () => {
		const [line] = linesOf([{ date: '2026-11-03', employees: [entry('ana', 3600, 80)] }]);

		expect(line.rate).toBe(80);
		expect(line.currency).toBe('USD');
		expect(line.amount).toBe(80);
		expect(line.rateSource).toBeNull();
		expect(line.rateNote).toBeNull();
		expect(linesOf([{ date: '2026-11-03', employees: [entry('ana', 3600, 80)] }], false)[0].rateNote).toBeNull();
	});

	it("shows the stored pay rate and the line's currency when the pay rate priced it", () => {
		const lines = linesOf(
			[
				{ date: '2026-11-03', employees: [entry('ana', 7200, 60, { rateSource: 'pay', currency: 'EUR' })] },
				{ date: '2026-11-04', employees: [entry('ana', 3600, 30, { rateSource: 'pay', currency: 'EUR' })] }
			],
			true,
			new Map([['ana', 30]])
		);

		for (const line of lines) {
			expect(line.rate).toBe(30);
			expect(line.currency).toBe('EUR');
			expect(line.rateSource).toBe('pay');
		}
		expect(lines.map((line) => line.amount)).toEqual([60, 30]);
	});

	it('never shows a rate worked out from rounded amounts: a placeholder while the pay rate is read', () => {
		const shortDay = entry('ana', 60, 0.83, { rateSource: 'pay', currency: 'USD' });

		const [line] = linesOf([{ date: '2026-11-03', employees: [shortDay] }], true, new Map(), new Set(['ana']));

		expect(line.rate).toBeNull();
		expect(line.amount).toBe(0.83);
		expect(rateShownOf(line)).toBe('loading');
	});

	it('shows no rate, and keeps the amount, when the pay rate read failed or came back empty', () => {
		const shortDay = entry('ana', 60, 0.83, { rateSource: 'pay', currency: 'USD' });

		const [line] = linesOf([{ date: '2026-11-03', employees: [shortDay] }]);

		expect(line.rate).toBeNull();
		expect(line.amount).toBe(0.83);
		expect(rateShownOf(line)).toBe('hidden');
	});

	it('shows the stored pay rate once read, for a short day too', () => {
		const shortDay = entry('ana', 60, 0.83, { rateSource: 'pay', currency: 'USD' });

		const [line] = linesOf([{ date: '2026-11-03', employees: [shortDay] }], true, new Map([['ana', 50]]));

		expect(line.rate).toBe(50);
		expect(rateShownOf(line)).toBe('rate');
	});

	it('still says "No rate" for a billing line without a rate', () => {
		const noBillingRate = { ...entry('ben', 3600, 0), employee: { id: 'ben', billRateValue: null } };

		const [line] = linesOf([{ date: '2026-11-03', employees: [noBillingRate] }]);

		expect(rateShownOf(line)).toBe('noRate');
	});

	it('keeps the amount of a pay line even when the member has no billing rate', () => {
		const payLine = entry('ana', 3600, 30, { rateSource: 'pay', currency: 'EUR' });
		const withoutBillingRate = { ...payLine, employee: { id: 'ana', billRateValue: null } };

		const [line] = linesOf([{ date: '2026-11-03', employees: [withoutBillingRate] }], true, new Map([['ana', 30]]));

		expect(line.amount).toBe(30);
		expect(line.rate).toBe(30);
	});

	it('never labels a pay amount with the billing currency when the report states none', () => {
		const [line] = linesOf([{ date: '2026-11-03', employees: [entry('ana', 3600, 30, { rateSource: 'pay' })] }]);

		expect(line.currency).toBeNull();
		expect(line.amount).toBe(30);
	});

	it('tells a pay rate reader that no pay rate is set on a line the billing rate priced', () => {
		const [line] = linesOf([
			{ date: '2026-11-03', employees: [entry('ben', 3600, 80, { rateSource: 'billing', currency: 'USD' })] }
		]);

		expect(line.rate).toBe(80);
		expect(line.amount).toBe(80);
		expect(line.rateNote).toBe('payRateNotSet');
	});

	it('only says "billing rate" to someone who may not read pay rates, with no claim about the pay rate', () => {
		const billingLine = entry('ben', 3600, 80, { rateSource: 'billing', currency: 'USD' });

		const [line] = linesOf([{ date: '2026-11-03', employees: [billingLine] }], false);

		expect(line.rate).toBe(80);
		expect(line.rateNote).toBe('billingRate');
	});
});

describe('owedFiguresOf', () => {
	it('totals each currency apart and never adds two currencies', () => {
		const lines = linesOf([
			{
				date: '2026-11-03',
				employees: [
					entry('ana', 3600, 30, { rateSource: 'pay', currency: 'EUR' }),
					entry('ben', 3600, 80, { rateSource: 'billing', currency: 'USD' })
				]
			}
		]);

		const totals = owedFiguresOf(lines).currencies.map((total) => [total.currency, total.amount]);

		expect(totals).toHaveLength(2);
		expect(totals).toEqual(
			expect.arrayContaining([
				['EUR', 30],
				['USD', 80]
			])
		);
	});
});

describe('payLineEmployeeIdsOf', () => {
	it('lists each member the pay rate priced once, and no one else', () => {
		const report = [
			{
				date: '2026-11-03',
				employees: [
					entry('ana', 3600, 30, { rateSource: 'pay' }),
					entry('ben', 3600, 80, { rateSource: 'billing' })
				]
			},
			{ date: '2026-11-04', employees: [entry('ana', 3600, 30, { rateSource: 'pay' }), entry('cid', 3600, 80)] }
		];

		expect(payLineEmployeeIdsOf(report)).toEqual(['ana']);
	});
});

describe('the rate each entry stores (#5212)', () => {
	function storedEntry(seconds: number, amount: number, currentRate: number | null, extra: Partial<Entry> = {}) {
		return entry('ana', seconds, amount, {
			employee: { id: 'ana', billRateValue: currentRate, billRateCurrency: 'USD', user: { name: 'ana' } },
			...extra
		});
	}

	it('shows the rate that priced a day when it is not the current one', () => {
		const [line] = linesOf([{ date: '2026-10-05', employees: [storedEntry(7.5 * 3600, 300, 50)] }]);

		expect(line.rate).toBe(40);
		expect(line.amount).toBe(300);
	});

	it('works out the plainest rate that gives a short entry its rounded amount', () => {
		const [line] = linesOf([{ date: '2026-10-05', employees: [storedEntry(60, 0.67, 50)] }]);

		expect(line.rate).toBe(40);
	});

	it('prices time tracked at a rate the member no longer has', () => {
		const [line] = linesOf([{ date: '2026-10-05', employees: [storedEntry(3600, 40, null)] }]);

		expect(line.rate).toBe(40);
		expect(line.amount).toBe(40);
	});

	it('leaves unpriced the time tracked before the member had a rate', () => {
		const [line] = linesOf([{ date: '2026-10-05', employees: [storedEntry(3600, 0, 50)] }]);

		expect(line.rate).toBeNull();
		expect(line.amount).toBeNull();
	});

	it('shows the stored pay rate of a day the current pay rate did not price', () => {
		const payDay = storedEntry(3600, 25, 50, { rateSource: 'pay', currency: 'EUR' });

		const [line] = linesOf([{ date: '2026-10-05', employees: [payDay] }], true, new Map([['ana', 30]]));

		expect(line.rate).toBe(25);
	});

	it('gives each currency of a member’s day a line of its own', () => {
		const lines = linesOf([
			{
				date: '2026-10-05',
				employees: [
					storedEntry(3600, 40, 40, { currency: 'USD' }),
					storedEntry(3600, 35, 40, { currency: 'EUR' })
				]
			}
		]);

		expect(new Set(lines.map((line) => line.key)).size).toBe(2);
	});

	it('says a member’s period at two rates has several, and one at a single rate states it', () => {
		const lines = linesOf([
			{ date: '2026-10-30', employees: [storedEntry(3600, 40, 50)] },
			{ date: '2026-11-02', employees: [storedEntry(3600, 50, 50)] }
		]);
		const rankOf = currencyRankOf(owedFiguresOf(lines).currencies);

		const [mixed] = memberGroupsOf(lines, rankOf);
		const [single] = memberGroupsOf(lines.slice(1), rankOf);

		expect(mixed.hasSeveralRates).toBe(true);
		expect(mixed.rate).toBeNull();
		expect(mixed.amount).toBe(90);
		expect(rateShownOf(mixed)).toBe('several');
		expect(single.hasSeveralRates).toBe(false);
		expect(single.rate).toBe(50);
	});

	it('notes the rate of each entry where time keeps its rate, else each member’s current rate', () => {
		expect(owedNoteKeyOf('keepsItsRate')).toBe('dashboard.paymentsDue.NOTE_STORED_RATES');
		expect(owedNoteKeyOf('takesNewRate')).toBe('dashboard.paymentsDue.NOTE');
		expect(owedNoteKeyOf(null)).toBe('dashboard.paymentsDue.NOTE');
	});
});
