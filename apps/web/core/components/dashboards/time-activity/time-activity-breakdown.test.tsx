/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null })
}));
// The page frame the dashboard kit imports pulls the whole app shell; the table needs none of it.
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));

import { billableFactsOf } from '@/core/lib/utils/dashboards/time-activity-billable';
import { TimeActivityBreakdown, breakdownColumnsOf } from './time-activity-breakdown';

const employeeLogs = [{ employee: { id: 'ada', fullName: 'Ada Lovelace' }, sum: 600, activity: 50, tasks: [] }];

const DAILY_REPORT = [
	{ date: '2026-11-03', logs: [{ project: { id: 'website', name: 'Website' }, employeeLogs }] }
] as unknown as ITimeLogGroupedDailyReport[];

/** Rows the clients of which are not told yet: the projects list could not be read. */
const ROWS_WITHOUT_CLIENTS = flattenDailyReport(DAILY_REPORT);

const PERIOD = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 7) };

function renderClientTable(isError: boolean, notice?: string) {
	return render(
		<TimeActivityBreakdown
			grouping="client"
			rows={ROWS_WITHOUT_CLIENTS}
			columns={breakdownColumnsOf('client', [], true)}
			period={PERIOD}
			isLoading={false}
			isError={isError}
			notice={notice}
			hasFilters={false}
			onRetry={jest.fn()}
			onClearFilters={jest.fn()}
			onPreviousPeriod={jest.fn()}
		/>
	);
}

describe('TimeActivityBreakdown grouped by client', () => {
	beforeAll(() => {
		// The notice of a failed read draws its mark through a hook that reads `window.matchMedia`, which jsdom lacks.
		window.matchMedia = jest.fn().mockReturnValue({
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		}) as unknown as typeof window.matchMedia;
	});

	it('shows its error and no rows when the clients of the rows cannot be told', () => {
		renderClientTable(true);

		expect(screen.getByText('dashboard.states.ERROR_TITLE')).toBeTruthy();
		expect(screen.queryAllByRole('rowgroup')).toHaveLength(0);
		expect(screen.queryByText('dashboard.timeActivity.table.COLLAPSE_ALL')).toBeNull();
	});

	it('gives each row and the total what its billable time bills, in a column of its own', () => {
		const priceAt90 = () => ({ rate: 90, currency: 'EUR', source: 'project' as const });
		render(
			<TimeActivityBreakdown
				grouping="project"
				rows={ROWS_WITHOUT_CLIENTS}
				billableFacts={billableFactsOf(ROWS_WITHOUT_CLIENTS, priceAt90)}
				columns={breakdownColumnsOf('project', [], true, true)}
				period={PERIOD}
				isLoading={false}
				isError={false}
				hasFilters={false}
				onRetry={jest.fn()}
				onClearFilters={jest.fn()}
				onPreviousPeriod={jest.fn()}
			/>
		);

		expect(screen.getByRole('columnheader', { name: 'dashboard.timeActivity.columns.BILLABLE' })).toBeTruthy();
		// 10 minutes at 90 an hour: the row and the total
		expect(screen.getAllByText('€15.00').length).toBeGreaterThanOrEqual(2);
	});

	it('offers no billable column to a role that may not read client rates', () => {
		expect(breakdownColumnsOf('project', [], true, false).billable).toBe(false);
		expect(breakdownColumnsOf('project', ['billable'], true, true).billable).toBe(false);
		expect(breakdownColumnsOf('project', [], true, true).billable).toBe(true);
	});

	it('shows its notice above the rows', () => {
		renderClientTable(false, 'The clients list could not load');

		expect(screen.getByText('The clients list could not load')).toBeTruthy();
		expect(screen.queryAllByRole('rowgroup')).toHaveLength(1);
	});
});
