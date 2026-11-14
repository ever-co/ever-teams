/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { TimeSplitState } from '@/core/hooks/dashboards/use-time-split';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
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
// The real section pulls the page skeleton's ESM-only dependencies, which this test does not need
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({
	DashboardSection: ({ ariaLabel, children }: { ariaLabel: string; children: unknown }) => (
		<section aria-label={ariaLabel}>{children as never}</section>
	)
}));

import { TimeActivityTimeSplit, type TimeActivitySplitSource } from './time-activity-time-split';

const SPLIT: TimeSplitState = {
	mode: 'project',
	setMode: jest.fn(),
	canSplitByClient: false,
	rows: splitRowsOf([{ key: 'a', name: 'Project A', imageUrl: null, color: null, isNone: false, seconds: 3600 }]),
	totalSeconds: 3600,
	namedCount: 1,
	isClientLookupPending: false,
	isClientLookupError: false,
	retryClientLookup: jest.fn()
};

function reportOf(overrides: Partial<TimeActivitySplitSource> = {}): TimeActivitySplitSource {
	return {
		rows: [],
		report: [],
		isManager: false,
		ownEmployeeId: 'marie',
		isDailyPending: false,
		isDailyError: false,
		refetchDaily: jest.fn(),
		...overrides
	};
}

function sourceOfLastCall() {
	return mockUseTimeSplit.mock.calls[mockUseTimeSplit.mock.calls.length - 1][0] as {
		keepRow: (row: Pick<DailyReportRow, 'employeeId'>) => boolean;
	};
}

beforeEach(() => {
	mockUseTimeSplit.mockClear();
	mockUseTimeSplit.mockReturnValue(SPLIT);
});

describe('TimeActivityTimeSplit', () => {
	it('splits the time the page shows, in its own section', () => {
		render(<TimeActivityTimeSplit report={reportOf()} />);

		expect(screen.getByRole('region', { name: 'dashboard.team.projects.TITLE' })).toBeTruthy();
		expect(screen.getByText('Project A')).toBeTruthy();
	});

	it('keeps to the member own time for someone who does not manage the report', () => {
		render(<TimeActivityTimeSplit report={reportOf()} />);

		const { keepRow } = sourceOfLastCall();
		expect(keepRow({ employeeId: 'marie' })).toBe(true);
		expect(keepRow({ employeeId: 'paul' })).toBe(false);
	});

	it('keeps every member time for a manager', () => {
		render(<TimeActivityTimeSplit report={reportOf({ isManager: true })} />);

		expect(sourceOfLastCall().keepRow({ employeeId: 'paul' })).toBe(true);
	});
});
