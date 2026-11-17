/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

// The PDF's elements as plain ones, so the table it lays out can be read; the renderer itself is not under test
jest.mock('@react-pdf/renderer', () => ({
	Document: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
	Page: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
	View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
	Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
	StyleSheet: { create: <T,>(styles: T) => styles }
}));

import { buildTimeActivityPdf, type TimeActivityPdfContent } from './time-activity-report-pdf';

function contentOf(showsLabels: boolean): TimeActivityPdfContent {
	return {
		title: 'Time & activity',
		period: 'Nov 3, 2026',
		generatedOn: 'Generated on November 17, 2026',
		filtersTitle: 'Filters',
		filters: [],
		summary: [],
		columns: {
			first: 'Member',
			second: 'Project',
			task: 'Task',
			labels: 'Labels',
			tracked: 'Tracked',
			earnings: 'Earnings',
			billable: 'Billable',
			activity: 'Activity'
		},
		showsEarnings: false,
		showsBillable: false,
		showsLabels,
		groups: [
			{
				key: '2026-11-03',
				title: 'Tuesday, Nov 3, 2026',
				tracked: '1h',
				earnings: '–',
				activity: '50%',
				rows: [
					{
						key: 'row-1',
						first: 'Ada Lovelace',
						second: 'Website',
						task: 'Home',
						labels: 'design',
						tracked: '1h',
						earnings: '–',
						activity: '50%'
					}
				]
			}
		],
		footer: 'Ever Teams · Time & activity',
		pageLabel: (page, total) => `${page} / ${total}`
	};
}

describe('the Time & activity PDF and the labels of entries (#5368)', () => {
	it('prints the table it always had where the API has no entry labels', () => {
		render(buildTimeActivityPdf(contentOf(false)));

		expect(screen.queryByText('Labels')).toBeNull();
		expect(screen.queryByText('design')).toBeNull();
		expect(screen.getByText('Task')).toBeTruthy();
	});

	it('prints a Labels column and the labels of each entry where the API stores them', () => {
		render(buildTimeActivityPdf(contentOf(true)));

		expect(screen.getByText('Labels')).toBeTruthy();
		expect(screen.getByText('design')).toBeTruthy();
	});
});
