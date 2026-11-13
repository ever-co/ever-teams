/**
 * The reports write their dates and amounts in the workspace's formats once one is chosen (#5087), and exactly as
 * before while none is: each helper below is the one a report or its export calls.
 */
import { formatAmount, formatAmounts } from '@/core/lib/utils/daily-report-figures';
import { formatPercent } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { dayLabelPartsOf } from '@/core/lib/utils/dashboards/actual-expected';
import { clockDateTimeOf, pdfDateTimeOf, pdfDayOf } from '@/core/lib/utils/dashboards/manual-time-edits';
import { dayDateOf, formatOwed, formatOwedTick, owedSegmentsOf } from '@/core/lib/utils/dashboards/payments-due';
import { amountTextOf, budgetTextOf } from '@/core/lib/utils/dashboards/project-budget';
import { timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { pdfShareOf, periodLabelOf } from '@/core/lib/utils/dashboards/weekly-limit';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';

const YEAR = new Date().getFullYear();
const JUNE_3 = new Date(YEAR, 5, 3, 9, 30);
const JUNE_9 = new Date(YEAR, 5, 9, 18, 0);
const LAST_YEAR_JUNE_3 = new Date(YEAR - 1, 5, 3, 9, 30);

const WORKSPACE: WorkspaceLocale = { tag: 'en', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234,56' };
const AUTOMATIC: WorkspaceLocale = { tag: 'en', dateFormat: null, numberFormat: null };

const COST_IN_EUROS = { budgetType: EProjectBudgetType.COST, currency: 'EUR' };
const HOURS = { budgetType: EProjectBudgetType.HOURS, currency: null };

describe('a report of a workspace that chose no format', () => {
	it('writes its dates and amounts as the bare language does', () => {
		const period = { from: JUNE_3, to: JUNE_9 };

		expect(formatPeriod(period, AUTOMATIC)).toBe(formatPeriod(period, 'en'));
		expect(formatAmount({ currency: 'EUR', amount: 1234.5 }, AUTOMATIC)).toBe('€1,234.50');
		expect(formatOwed(1234.5, null, AUTOMATIC)).toBe('1,234.50');
		expect(dayDateOf(JUNE_3, AUTOMATIC)).toBe(dayDateOf(JUNE_3, 'en'));
		expect(periodLabelOf(JUNE_3, 'day', AUTOMATIC)).toBe(periodLabelOf(JUNE_3, 'day', 'en'));
	});

	it('keeps the dates of a Manual time edit PDF line as the files write them', () => {
		expect(pdfDayOf(JUNE_3, AUTOMATIC)).toBe(`${YEAR}-06-03`);
		expect(pdfDayOf(JUNE_3, 'en')).toBe(`${YEAR}-06-03`);
		expect(pdfDateTimeOf(JUNE_9, AUTOMATIC)).toBe(clockDateTimeOf(JUNE_9));
	});
});

describe("a report's dates in the workspace's date format", () => {
	it('writes the period of the toolbar and of the exports, with the year only when it is needed', () => {
		expect(formatPeriod({ from: JUNE_3, to: JUNE_9 }, WORKSPACE)).toBe('03/06 \u2013 09/06');
		expect(formatPeriod({ from: JUNE_3, to: JUNE_3 }, WORKSPACE)).toBe('03/06');
		expect(formatPeriod({ from: LAST_YEAR_JUNE_3, to: JUNE_9 }, WORKSPACE)).toBe(
			`03/06/${YEAR - 1} \u2013 09/06/${YEAR}`
		);
	});

	it('writes the day of a payments due line', () => {
		expect(dayDateOf(JUNE_3, WORKSPACE)).toBe('03/06');
		expect(dayDateOf(LAST_YEAR_JUNE_3, WORKSPACE)).toBe(`03/06/${YEAR - 1}`);
	});

	it('writes the day and the week of a weekly limit line, keeping the weekday', () => {
		const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(JUNE_3);

		expect(periodLabelOf(JUNE_3, 'day', WORKSPACE)).toBe(`${weekday} 03/06`);
		expect(periodLabelOf(JUNE_3, 'week', WORKSPACE)).toMatch(/^03\/06 \u2013 \d{2}\/06$/);
	});

	it('writes the day of an actual and expected hours line, the weekday apart', () => {
		const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(JUNE_3);

		expect(dayLabelPartsOf(JUNE_3, WORKSPACE)).toEqual({ weekday, date: '03/06' });
	});

	it('writes the day and the edit moment of a Manual time edit PDF line, with the year and the 24-hour time', () => {
		expect(pdfDayOf(JUNE_3, WORKSPACE)).toBe(`03/06/${YEAR}`);
		expect(pdfDateTimeOf(JUNE_9, WORKSPACE)).toBe(`09/06/${YEAR} 18:00`);
		expect(pdfDateTimeOf(null, WORKSPACE)).toBe('');
	});

	it('writes the day of a timesheet, and leaves its weekday, month title and clock time alone', () => {
		const formatters = timesheetFormattersOf(WORKSPACE);
		const plain = timesheetFormattersOf('en');

		expect(formatters.dayDate(JUNE_3)).toBe('03/06');
		expect(formatters.dayDate(LAST_YEAR_JUNE_3)).toBe(`03/06/${YEAR - 1}`);
		expect(formatters.weekday(JUNE_3)).toBe(plain.weekday(JUNE_3));
		expect(formatters.monthTitle(JUNE_3)).toBe(plain.monthTitle(JUNE_3));
		expect(formatters.time(JUNE_3)).toBe(plain.time(JUNE_3));
	});

	it('does not answer one workspace with the dates another was given', () => {
		const iso: WorkspaceLocale = { tag: 'en', dateFormat: 'YYYY-MM-DD', numberFormat: null };
		const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(JUNE_3);

		expect(periodLabelOf(JUNE_3, 'day', WORKSPACE)).toBe(`${weekday} 03/06`);
		expect(periodLabelOf(JUNE_3, 'day', iso)).toBe(`${weekday} 06-03`);
		expect(dayLabelPartsOf(JUNE_3, WORKSPACE).date).toBe('03/06');
		expect(dayLabelPartsOf(JUNE_3, iso).date).toBe('06-03');
	});
});

describe("a report's amounts in the workspace's number format", () => {
	it('writes earnings and rates, one currency or several', () => {
		expect(formatAmount({ currency: 'EUR', amount: 1234.5 }, WORKSPACE)).toBe('€1.234,50');
		expect(
			formatAmounts(
				[
					{ currency: 'EUR', amount: 1234.5 },
					{ currency: 'USD', amount: 80 }
				],
				WORKSPACE
			)
		).toBe('€1.234,50 · $80,00');
	});

	it('writes what is owed, with and without a currency, and the short figures of the chart', () => {
		expect(formatOwed(1234.5, 'USD', WORKSPACE)).toBe('$1.234,50');
		expect(formatOwed(1234.5, null, WORKSPACE)).toBe('1.234,50');
		expect(formatOwedTick(1500, 'USD', WORKSPACE)).toBe('$1,5K');
	});

	it('keeps the cents of an owed amount apart, behind the workspace decimal mark', () => {
		expect(owedSegmentsOf(1234.5, 'USD', WORKSPACE)).toEqual([
			{ text: '$1.234', isMinor: false },
			{ text: ',50', isMinor: true }
		]);
	});

	it('writes a budget in money and in hours', () => {
		expect(amountTextOf(12500.5, COST_IN_EUROS, WORKSPACE)).toBe('€12.500,50');
		expect(budgetTextOf(12500, COST_IN_EUROS, WORKSPACE)).toBe('€12.500,00');
		expect(budgetTextOf(6021, HOURS, WORKSPACE)).toBe('6.021h');
		expect(amountTextOf(1500.5, HOURS, WORKSPACE)).toBe('1.500h 30m');
	});

	it('leaves a whole percentage as the language writes it', () => {
		expect(formatPercent(47, WORKSPACE)).toBe(formatPercent(47, 'en'));
	});

	it('writes the share of a limit in the limit PDFs, and keeps it as it was while no format is chosen', () => {
		expect(pdfShareOf(12.5, WORKSPACE)).toBe('12,50%');
		expect(pdfShareOf(2000, WORKSPACE)).toBe('2.000,00%');
		expect(pdfShareOf(12.5, AUTOMATIC)).toBe('12.50%');
		expect(pdfShareOf(12.5, 'fr')).toBe('12.50%');
		expect(pdfShareOf(12.5)).toBe('12.50%');
	});
});
