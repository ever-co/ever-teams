import type { TOwedReportDay } from '@/core/types/schemas/timer/time-log-reports.schema';
import { fallsBackToBillingRate, owedFiguresOf, owedLinesOf, type PaymentsMember } from './payments-due';

type Entry = TOwedReportDay['employees'][number];

function entry(employeeId: string, seconds: number, amount: number, extra: Partial<Entry> = {}): Entry {
	return {
		employee: { id: employeeId, billRateValue: 80, billRateCurrency: 'USD', user: { name: employeeId } },
		duration: seconds,
		amount,
		...extra
	};
}

function linesOf(days: Array<{ date: string; employees: Entry[] }>) {
	return owedLinesOf({
		report: days,
		members: new Map<string, PaymentsMember>(),
		organizationCurrency: 'EUR',
		unnamedLabel: 'Unnamed'
	});
}

describe('owedLinesOf', () => {
	it('prices a line as before when the server does not say which rate priced it', () => {
		const [line] = linesOf([{ date: '2026-11-03', employees: [entry('ana', 3600, 80)] }]);

		expect(line.rate).toBe(80);
		expect(line.currency).toBe('USD');
		expect(line.amount).toBe(80);
		expect(line.rateSource).toBeNull();
		expect(fallsBackToBillingRate(line.rateSource)).toBe(false);
	});

	it("shows the pay rate and the line's currency when the pay rate priced it", () => {
		const lines = linesOf([
			{ date: '2026-11-03', employees: [entry('ana', 7200, 60, { rateSource: 'pay', currency: 'EUR' })] },
			{ date: '2026-11-04', employees: [entry('ana', 3600, 30, { rateSource: 'pay', currency: 'EUR' })] }
		]);

		for (const line of lines) {
			expect(line.rate).toBe(30);
			expect(line.currency).toBe('EUR');
			expect(line.rateSource).toBe('pay');
		}
		expect(lines.map((line) => line.amount)).toEqual([60, 30]);
	});

	it('keeps the amount of a pay line even when the member has no billing rate', () => {
		const payLine = entry('ana', 3600, 30, { rateSource: 'pay', currency: 'EUR' });
		const withoutBillingRate = { ...payLine, employee: { id: 'ana', billRateValue: null } };

		const [line] = linesOf([{ date: '2026-11-03', employees: [withoutBillingRate] }]);

		expect(line.amount).toBe(30);
		expect(line.rate).toBe(30);
	});

	it('notes the billing rate when the server says no pay rate is set', () => {
		const [line] = linesOf([
			{ date: '2026-11-03', employees: [entry('ben', 3600, 80, { rateSource: 'billing', currency: 'USD' })] }
		]);

		expect(line.rate).toBe(80);
		expect(line.amount).toBe(80);
		expect(fallsBackToBillingRate(line.rateSource)).toBe(true);
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
