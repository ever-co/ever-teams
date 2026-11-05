import { memberGroupsOf, owedLinesOf, pricedRateOf } from './payments-due';
import type { TOwedReportDay } from '@/core/types/schemas/timer/time-log-reports.schema';

const HOUR = 3600;

describe('pricedRateOf', () => {
	it("keeps the member's own rate when Gauzy priced the day at it, rounding included", () => {
		expect(pricedRateOf(40, 3 * HOUR, 120)).toBe(40);
		expect(pricedRateOf(40, 1000, 11.11)).toBe(40);
	});

	it('keeps the own rate, or no rate, for a day Gauzy did not price', () => {
		expect(pricedRateOf(40, 3 * HOUR, 0)).toBe(40);
		expect(pricedRateOf(null, 3 * HOUR, 0)).toBeNull();
		expect(pricedRateOf(null, 0, 50)).toBeNull();
	});

	it('takes the amount over the hours when project rates priced the day', () => {
		expect(pricedRateOf(40, 2 * HOUR, 100)).toBe(50);
		expect(pricedRateOf(null, 3 * HOUR, 150)).toBe(50);
	});
});

const ANA = { id: 'employee-ana', billRateValue: 40, billRateCurrency: 'USD', user: { name: 'Ana Lima' } };
const BEN = { id: 'employee-ben', billRateValue: null, billRateCurrency: null, user: { name: 'Ben Ode' } };

function report(): TOwedReportDay[] {
	return [
		{
			date: '2026-11-03',
			employees: [
				{ employee: ANA, duration: 2 * HOUR, amount: 80 },
				{ employee: BEN, duration: 2 * HOUR, amount: 120 }
			]
		},
		{ date: '2026-11-04', employees: [{ employee: ANA, duration: 2 * HOUR, amount: 100 }] }
	] as TOwedReportDay[];
}

describe('owed lines and member groups with project rates', () => {
	const lines = owedLinesOf({
		report: report(),
		members: new Map(),
		organizationCurrency: 'USD',
		unnamedLabel: 'Unnamed'
	});

	it("prices a member without a rate of their own whom a project's rate paid, instead of showing no rate", () => {
		const benLine = lines.find((line) => line.employeeId === 'employee-ben');

		expect(benLine?.rate).toBe(60);
		expect(benLine?.amount).toBe(120);
	});

	it("keeps the own rate on a day at it, and shows the project's on a day priced by it", () => {
		const anaLines = lines.filter((line) => line.employeeId === 'employee-ana');

		expect(anaLines.map((line) => line.rate)).toEqual([40, 50]);
		expect(anaLines.map((line) => line.amount)).toEqual([80, 100]);
	});

	it('gives a member whose days differ the rate of the whole period, so hours times rate is the amount', () => {
		const groups = memberGroupsOf(lines, () => 0);
		const ana = groups.find((group) => group.employeeId === 'employee-ana');

		expect(ana?.amount).toBe(180);
		expect(ana?.rate).toBe(45);
	});
});
