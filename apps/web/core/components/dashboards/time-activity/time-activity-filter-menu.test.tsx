/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { TIME_ACTIVITY_FILTER_FIELDS, type TimeActivityFilters } from '@/core/lib/utils/dashboards/time-activity';
import type { TimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

let supportsEntryLabels = true;
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({
	useEntryLabelsSupport: () => supportsEntryLabels
}));

// The menu's primitives open in a portal on a pointer gesture jsdom does not have: every row is drawn at once here.
jest.mock('@base-ui/react/menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	const Item = ({ children }: { children?: ReactNode }) => <div role="menuitem">{children}</div>;
	return {
		Menu: {
			Root: Pass,
			Trigger: Pass,
			Portal: Pass,
			Positioner: Pass,
			Popup: Pass,
			Separator: () => <hr />,
			Item,
			SubmenuRoot: Pass,
			SubmenuTrigger: Item,
			CheckboxItem: Item,
			CheckboxItemIndicator: Pass
		}
	};
});

import { TimeActivityFilterMenu } from './time-activity-filter-menu';

function emptyOptions(): TimeActivityFilterOptions {
	const options: Record<string, []> = {};
	for (const field of TIME_ACTIVITY_FILTER_FIELDS) {
		options[field] = [];
	}
	return options as unknown as TimeActivityFilterOptions;
}

function noFilters(): TimeActivityFilters {
	const filters: Record<string, string[]> = {};
	for (const field of TIME_ACTIVITY_FILTER_FIELDS) {
		filters[field] = [];
	}
	return filters as unknown as TimeActivityFilters;
}

function renderMenu() {
	render(
		<TimeActivityFilterMenu
			options={emptyOptions()}
			filters={noFilters()}
			activeFilterCount={0}
			onChange={jest.fn()}
			onClear={jest.fn()}
		/>
	);
}

describe('the Time & activity filter menu and the labels of entries (#5368)', () => {
	it('offers Labels where the API stores labels on entries', () => {
		supportsEntryLabels = true;
		renderMenu();

		expect(screen.getByText('common.LABELS')).toBeTruthy();
	});

	it('leaves Labels out where the API has none, as Timesheets does', () => {
		supportsEntryLabels = false;
		renderMenu();

		expect(screen.queryByText('common.LABELS')).toBeNull();
		expect(screen.getByText('dashboard.timeActivity.filters.PROJECTS')).toBeTruthy();
	});
});
