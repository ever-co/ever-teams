/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import type { TimeSplitState } from '@/core/hooks/dashboards/use-time-split';
import { splitRowsOf } from '@/core/lib/utils/dashboards/time-split';

const mockUseTimeSplit = jest.fn();

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (values && 'count' in values) {
			return `${key}:${values.count}`;
		}
		return key;
	}
}));
jest.mock('@/core/hooks/dashboards/use-time-split', () => ({
	useTimeSplit: (source: unknown) => mockUseTimeSplit(source)
}));

import { TeamTimeSplit } from './team-time-split';

const HOUR = 3600;

const SPLIT: TimeSplitState = {
	mode: 'project',
	setMode: jest.fn(),
	canSplitByClient: false,
	rows: splitRowsOf([{ key: 'a', name: 'Project A', imageUrl: null, color: null, isNone: false, seconds: HOUR }]),
	totalSeconds: HOUR,
	namedCount: 1,
	isClientLookupPending: false,
	isClientLookupError: false,
	retryClientLookup: jest.fn()
};

function dashboardOf(overrides: Partial<TeamDashboardState> = {}) {
	return {
		rows: [{ key: 'row' }],
		report: [{ date: '2026-11-10', logs: [] }],
		isReportLoading: false,
		isReportError: false,
		isRefreshing: false,
		refetchReport: jest.fn(),
		...overrides
	} as unknown as TeamDashboardState;
}

beforeEach(() => {
	mockUseTimeSplit.mockReturnValue(SPLIT);
});

describe('TeamTimeSplit', () => {
	it('splits the rows of the team report and shows them in a card beside the tasks', () => {
		const dashboard = dashboardOf();

		const { container } = render(<TeamTimeSplit dashboard={dashboard} />);

		expect(mockUseTimeSplit).toHaveBeenCalledWith({ rows: dashboard.rows, report: dashboard.report });
		expect(screen.getByRole('region', { name: 'dashboard.team.projects.TITLE' })).toBeTruthy();
		expect(screen.getByText('dashboard.team.projects.COUNT:1')).toBeTruthy();
		expect(screen.getByText('Project A')).toBeTruthy();
		expect(container.querySelector('section')?.className).toContain('xl:col-span-4');
	});

	it('gives the names the room of the narrow card: no meter on the rows', () => {
		const { container } = render(<TeamTimeSplit dashboard={dashboardOf()} />);

		expect(container.querySelectorAll('li > span[aria-hidden="true"]')).toHaveLength(0);
	});

	it('shows no rows while the team report loads', () => {
		render(<TeamTimeSplit dashboard={dashboardOf({ isReportLoading: true })} />);

		expect(screen.queryByText('Project A')).toBeNull();
	});
});
