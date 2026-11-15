/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { TimeActivityFigures } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null })
}));
jest.mock('@/core/hooks/dashboards/time-activity/use-time-activity-filter-options', () => ({
	useTimeActivityFilterOptions: () => ({})
}));
// The page frame the dashboard kit imports pulls the whole app shell; the band needs none of it.
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));

import { TimeActivitySummaryBand } from './time-activity-summary-band';

const HOUR = 3600;

const FIGURES: TimeActivityFigures = {
	trackedSeconds: HOUR,
	reportSeconds: HOUR,
	activityPercent: 50,
	totals: {
		seconds: HOUR,
		activeSeconds: HOUR / 2,
		trackedSeconds: HOUR,
		earnings: [],
		dayCount: 1,
		memberCount: 1,
		projectCount: 1,
		membersWithoutRate: 0
	}
};

describe('TimeActivitySummaryBand', () => {
	it('says beside the total that the time is rounded, with the rule', () => {
		render(
			<TimeActivitySummaryBand
				figures={FIGURES}
				isManager={false}
				isLoading={false}
				actions={null}
				roundingRule={{ intervalMinutes: 15, direction: 'UP' }}
			/>
		);

		expect(screen.getByText('dashboard.timeActivity.sheet.ROUNDED_UP {"minutes":15}')).toBeTruthy();
	});

	it('names the direction of the rule', () => {
		render(
			<TimeActivitySummaryBand
				figures={FIGURES}
				isManager={false}
				isLoading={false}
				actions={null}
				roundingRule={{ intervalMinutes: 6, direction: 'NEAREST' }}
			/>
		);

		expect(screen.getByText('dashboard.timeActivity.sheet.ROUNDED_NEAREST {"minutes":6}')).toBeTruthy();
	});

	it('says nothing of rounding without a rule', () => {
		render(<TimeActivitySummaryBand figures={FIGURES} isManager={false} isLoading={false} actions={null} />);

		expect(screen.queryByText(/ROUNDED_/)).toBeNull();
	});
});

describe('TimeActivitySummaryBand breaks figure (#5216)', () => {
	it('shows the time on breaks beside the worked time', () => {
		render(
			<TimeActivitySummaryBand
				figures={{ ...FIGURES, breakSeconds: HOUR }}
				isManager={false}
				isLoading={false}
				actions={null}
			/>
		);

		expect(screen.getByText('breaks.FIGURE_LABEL')).toBeTruthy();
		expect(screen.getByTitle('breaks.FIGURE_HINT')).toBeTruthy();
	});

	it('shows none where breaks are not read', () => {
		render(<TimeActivitySummaryBand figures={FIGURES} isManager={false} isLoading={false} actions={null} />);

		expect(screen.queryByText('breaks.FIGURE_LABEL')).toBeNull();
	});

	it('says the figure is unavailable when the breaks could not be read', () => {
		render(
			<TimeActivitySummaryBand
				figures={{ ...FIGURES, breakSeconds: null }}
				isManager={false}
				isLoading={false}
				actions={null}
			/>
		);

		expect(screen.getByText('breaks.FIGURE_LABEL')).toBeTruthy();
		expect(screen.getAllByText('dashboard.timeActivity.figures.UNAVAILABLE').length).toBeGreaterThan(0);
	});
});
