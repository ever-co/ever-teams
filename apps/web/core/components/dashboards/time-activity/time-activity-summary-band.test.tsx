/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type {
	TimeActivityBillable,
	TimeActivityFigures
} from '@/core/hooks/dashboards/time-activity/use-time-activity-report';

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
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

import React from 'react';
import { UnpricedBillableNote } from './time-activity-report-sheet';
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

	const BILLABLE: TimeActivityBillable = {
		isOffered: true,
		facts: [],
		figures: { amounts: [{ currency: 'EUR', amount: 1200 }], seconds: 17 * HOUR, unpricedSeconds: 2 * HOUR },
		isPending: false,
		isError: false,
		canSetDefaultRate: true,
		refetch: jest.fn()
	};

	it('writes what the billable time bills beside that time, to a role that may read client rates', () => {
		render(
			<TimeActivitySummaryBand figures={FIGURES} isManager isLoading={false} actions={null} billable={BILLABLE} />
		);

		expect(screen.getByText('dashboard.timeActivity.columns.BILLABLE')).toBeTruthy();
		expect(screen.getByText(/1,200/)).toBeTruthy();
		expect(screen.getByText('dashboard.timeActivity.figures.BILLABLE_TIME {"duration":"17h 0m"}')).toBeTruthy();
	});

	it('writes amounts of two currencies apart', () => {
		const twoCurrencies = {
			...BILLABLE,
			figures: {
				...BILLABLE.figures,
				amounts: [
					{ currency: 'EUR', amount: 1200 },
					{ currency: 'USD', amount: 50 }
				]
			}
		};
		render(
			<TimeActivitySummaryBand
				figures={FIGURES}
				isManager
				isLoading={false}
				actions={null}
				billable={twoCurrencies}
			/>
		);

		expect(screen.getByText(/1,200\.00.*·.*\$50\.00/)).toBeTruthy();
	});

	it('shows no billable amount to a role that may not read client rates', () => {
		const refused = { ...BILLABLE, isOffered: false };
		render(
			<TimeActivitySummaryBand figures={FIGURES} isManager isLoading={false} actions={null} billable={refused} />
		);

		expect(screen.queryByText('dashboard.timeActivity.columns.BILLABLE')).toBeNull();
	});

	it('counts the billable time no rate prices apart, with the way to set a default rate', () => {
		render(<UnpricedBillableNote billable={BILLABLE} />);

		expect(screen.getByText('dashboard.timeActivity.sheet.UNPRICED_NOTE {"duration":"2h 0m"}')).toBeTruthy();
		expect(
			screen.getByRole('link', { name: 'dashboard.timeActivity.sheet.SET_DEFAULT_RATE' }).getAttribute('href')
		).toBe('/settings/workspace#formats');
	});

	it('offers no link to a reader who may not set the default rate', () => {
		render(<UnpricedBillableNote billable={{ ...BILLABLE, canSetDefaultRate: false }} />);

		expect(screen.getByText(/UNPRICED_NOTE/)).toBeTruthy();
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('says nothing of rounding without a rule', () => {
		render(<TimeActivitySummaryBand figures={FIGURES} isManager={false} isLoading={false} actions={null} />);

		expect(screen.queryByText(/ROUNDED_/)).toBeNull();
	});
});
