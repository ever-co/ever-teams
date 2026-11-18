/** @jest-environment jsdom */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { IPublicSavedReport } from '@/core/types/interfaces/timesheet/saved-report';

const mockReadShared = jest.fn();
const mockTableRows = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
// The table's module reaches the app layout, which this page does not use, as the table's own test mocks it
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));
jest.mock('@/core/services/client/api/timesheets/saved-report.service', () => ({
	savedReportService: { readShared: (token: string) => mockReadShared(token) }
}));
// The notice's status orb reads the motion setting (`matchMedia`), which jsdom lacks
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description }: { title: string; description?: string }) => (
		<div role="status">
			<p>{title}</p>
			<p>{description}</p>
		</div>
	)
}));
jest.mock('@/core/components/dashboards/time-activity/time-activity-area-chart', () => ({
	TimeActivityAreaChart: ({ days }: { days: unknown[] }) => <div data-testid="chart">{days.length} days</div>,
	TimeActivityAreaChartSkeleton: () => <div data-testid="chart-skeleton" />
}));
jest.mock('@/core/components/dashboards/time-activity/time-activity-breakdown', () => ({
	...jest.requireActual('@/core/components/dashboards/time-activity/time-activity-breakdown'),
	TimeActivityBreakdown: ({
		rows,
		columns,
		grouping,
		notice
	}: {
		rows: { employeeName: string }[];
		columns: { earnings: boolean };
		grouping: string;
		notice?: ReactNode;
	}) => {
		mockTableRows(rows);
		return (
			<div data-testid="table" data-grouping={grouping}>
				{notice}
				{rows.map((row) => row.employeeName).join(', ')} earnings:{String(columns.earnings)}
			</div>
		);
	}
}));

import { SharedReportPage } from './shared-report-page';

function renderPage(token = 'tok-1') {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return render(<SharedReportPage token={token} />, { wrapper });
}

function sharedReport(fields: Partial<IPublicSavedReport> = {}): IPublicSavedReport {
	return {
		name: 'Client A, last month',
		kind: 'TIME_AND_ACTIVITY',
		grouping: 'project',
		includeAmounts: false,
		period: { rule: 'lastMonth', startDate: '2026-10-01', endDate: '2026-10-31', timeZone: 'UTC' },
		generatedAt: '2026-11-14T10:00:00.000Z',
		days: [
			{
				date: '2026-10-02',
				sum: 5400,
				logs: [
					{
						project: {
							id: 'p1',
							name: 'Website',
							organizationContact: { id: 'client-a', name: 'Client A' }
						},
						employeeLogs: [
							{
								employee: {
									id: 'ada',
									fullName: 'Ada Lovelace',
									user: { firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace' }
								},
								sum: 5400,
								tasks: [{ task: { id: 't1', title: 'Home page' }, duration: 5400, client: null }]
							}
						]
					}
				]
			}
		],
		totals: { duration: 5400 },
		...fields
	};
}

describe('SharedReportPage', () => {
	beforeEach(() => {
		mockReadShared.mockReset();
	});

	it('shows the report read through its link: name, period, total, chart and table, read only', async () => {
		mockReadShared.mockResolvedValue(sharedReport());

		renderPage('tok-1');

		expect(await screen.findByRole('heading', { name: 'Client A, last month' })).toBeTruthy();
		expect(mockReadShared).toHaveBeenCalledWith('tok-1');
		expect(screen.getByText('1h 30m')).toBeTruthy();
		expect(screen.getByTestId('chart').textContent).toBe('31 days');
		expect(screen.getByTestId('table').textContent).toContain('Ada Lovelace');
		expect(screen.getByText('sharedReport.READ_ONLY_BADGE')).toBeTruthy();
		expect(screen.getByText(/sharedReport\.READ_ONLY \{/)).toBeTruthy();
	});

	it('shows durations only when the author left amounts out', async () => {
		mockReadShared.mockResolvedValue(sharedReport());

		renderPage();

		await screen.findByTestId('table');
		expect(screen.queryByText('dashboard.timeActivity.columns.EARNINGS')).toBeNull();
		expect(screen.getByTestId('table').textContent).toContain('earnings:false');
	});

	it('shows the amounts per currency, summed from the rows like the table, when the author included them', async () => {
		const withRate = sharedReport({
			includeAmounts: true,
			totals: { duration: 5400, amounts: [{ currency: 'EUR', amount: 75.01 }] }
		});
		const [day] = withRate.days;
		const [projectLog] = day.logs;
		const [employeeLog] = projectLog.employeeLogs;
		employeeLog.employee = { ...employeeLog.employee, billRateValue: 50, billRateCurrency: 'EUR' };
		mockReadShared.mockResolvedValue(withRate);

		renderPage();

		expect(await screen.findByText('dashboard.timeActivity.columns.EARNINGS')).toBeTruthy();
		expect(screen.getByText(/75.00/)).toBeTruthy();
		expect(screen.getByTestId('table').textContent).toContain('earnings:true');
	});

	it("prices each entry at the rate it stores, as the report page does, not at the member's rate of today", async () => {
		const loggedBefore = sharedReport({
			includeAmounts: true,
			totals: { duration: 5400, amounts: [{ currency: 'EUR', amount: 60 }] }
		});
		const [employeeLog] = loggedBefore.days[0].logs[0].employeeLogs;
		// Ada bills 80 EUR today; her 1 h 30 m were logged at 40 EUR, the rate the entry stores
		employeeLog.employee = { ...employeeLog.employee, billRateValue: 80, billRateCurrency: 'EUR' };
		employeeLog.tasks = employeeLog.tasks.map((entry) => ({
			...entry,
			billRateValue: 40,
			billRateCurrency: 'EUR'
		}));
		mockReadShared.mockResolvedValue(loggedBefore);

		renderPage();

		expect(await screen.findByText('dashboard.timeActivity.columns.EARNINGS')).toBeTruthy();
		expect(screen.getByText(/60\.00/)).toBeTruthy();
		expect(screen.queryByText(/120\.00/)).toBeNull();
	});

	it('says a link that does not work any more no longer works', async () => {
		mockReadShared.mockRejectedValue({ statusCode: 404, message: 'This report link does not work.' });

		renderPage();

		expect(await screen.findByText('sharedReport.NOT_WORKING_TITLE')).toBeTruthy();
		expect(screen.queryByTestId('table')).toBeNull();
	});

	it('hides a report read before once a later read finds its link no longer works', async () => {
		mockReadShared
			.mockResolvedValueOnce(sharedReport())
			.mockRejectedValue({ statusCode: 404, message: 'This report link does not work.' });
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(
			<QueryClientProvider client={queryClient}>
				<SharedReportPage token="tok-1" />
			</QueryClientProvider>
		);
		expect(await screen.findByRole('heading', { name: 'Client A, last month' })).toBeTruthy();

		await act(() => queryClient.refetchQueries());

		expect(await screen.findByText('sharedReport.NOT_WORKING_TITLE')).toBeTruthy();
		expect(screen.queryByRole('heading', { name: 'Client A, last month' })).toBeNull();
		expect(screen.queryByTestId('table')).toBeNull();
	});

	it('reads again after a server failure, then offers to try again', async () => {
		mockReadShared.mockRejectedValue({ statusCode: 503, message: 'Service unavailable' });

		renderPage();

		// A server failure is read again twice (1 s, then 2 s apart) before the page says so
		expect(await screen.findByText('sharedReport.ERROR_TITLE', undefined, { timeout: 8000 })).toBeTruthy();
		expect(mockReadShared).toHaveBeenCalledTimes(3);
		expect(screen.getByText('pages.unauthorized.TRY_AGAIN')).toBeTruthy();
	}, 15000);

	it('says an address that carries no token does not work, and reads nothing', () => {
		renderPage('');

		expect(screen.getByText('sharedReport.NOT_WORKING_TITLE')).toBeTruthy();
		expect(screen.queryByLabelText('sharedReport.LOADING')).toBeNull();
		expect(mockReadShared).not.toHaveBeenCalled();
	});

	it('waits while the address has not been read yet', () => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<SharedReportPage token={null} />
			</QueryClientProvider>
		);

		expect(screen.getByLabelText('sharedReport.LOADING')).toBeTruthy();
		expect(screen.queryByText('sharedReport.NOT_WORKING_TITLE')).toBeNull();
		expect(mockReadShared).not.toHaveBeenCalled();
	});

	it('says no time was tracked in an empty period', async () => {
		mockReadShared.mockResolvedValue(sharedReport({ days: [], totals: { duration: 0 } }));

		renderPage();

		expect(await screen.findByText('sharedReport.EMPTY')).toBeTruthy();
		await waitFor(() => expect(screen.queryByTestId('table')).toBeNull());
	});
});

describe('SharedReportPage, a project the API keeps from the report (CORE-27)', () => {
	beforeEach(() => {
		mockReadShared.mockReset();
		mockTableRows.mockReset();
	});

	it('names its time "Private project(s)" in the table, never "No project"', async () => {
		const report = sharedReport();
		const [day] = report.days;
		const hiddenLog = { ...day.logs[0], project: { id: 'p-hidden', projectHidden: true } };
		mockReadShared.mockResolvedValue({
			...report,
			days: [{ ...day, logs: [hiddenLog] }]
		} as unknown as IPublicSavedReport);

		renderPage();

		await screen.findByTestId('table');
		const rows = mockTableRows.mock.calls.at(-1)?.[0] as Array<Record<string, unknown>>;
		expect(rows[0]).toMatchObject({
			isProjectHidden: true,
			projectName: 'common.PRIVATE_PROJECT',
			projectGroupName: 'common.PRIVATE_PROJECTS'
		});
	});
});

describe('SharedReportPage, a report grouped by label (ever-gauzy#12073)', () => {
	const DESIGN = { id: 'design', name: 'Design', color: '#ff0000' };
	const REVIEW = { id: 'review', name: 'Review', color: null };

	beforeEach(() => {
		mockReadShared.mockReset();
		mockTableRows.mockReset();
	});

	/** The report grouped by label, Ada's entry filed under `labels`. */
	function byLabel(labels: { id: string; name: string; color: string | null }[]) {
		const report = sharedReport({ grouping: 'label' });
		const [employeeLog] = report.days[0].logs[0].employeeLogs;
		employeeLog.tasks = employeeLog.tasks.map((entry) => ({ ...entry, tags: labels }));
		return report;
	}

	it('groups the table by the labels each entry states', async () => {
		mockReadShared.mockResolvedValue(byLabel([DESIGN]));

		renderPage();

		const table = await screen.findByTestId('table');
		expect(table.getAttribute('data-grouping')).toBe('label');
		const rows = mockTableRows.mock.calls.at(-1)?.[0] as Array<{ tasks: Array<{ labels?: unknown }> }>;
		expect(rows[0].tasks[0].labels).toEqual([DESIGN]);
		expect(screen.queryByText('timer.labels.OVERLAP_TITLE')).toBeNull();
	});

	it('says, as the report page does, that an entry with two labels counts under each', async () => {
		mockReadShared.mockResolvedValue(byLabel([DESIGN, REVIEW]));

		renderPage();

		await screen.findByTestId('table');
		expect(screen.getByText('timer.labels.OVERLAP_TITLE')).toBeTruthy();
	});

	it('says nothing of labels under any other grouping', async () => {
		const byProject = byLabel([DESIGN, REVIEW]);
		mockReadShared.mockResolvedValue({ ...byProject, grouping: 'project' });

		renderPage();

		const table = await screen.findByTestId('table');
		expect(table.getAttribute('data-grouping')).toBe('project');
		expect(screen.queryByText('timer.labels.OVERLAP_TITLE')).toBeNull();
	});
});
