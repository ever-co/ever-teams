/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { TimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import type { TimeActivityGrouping } from '@/core/lib/utils/dashboards/time-activity';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null })
}));
jest.mock('@/core/hooks/dashboards/time-activity/use-time-activity-filter-options', () => ({
	useTimeActivityFilterOptions: () => ({})
}));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({
	DashboardToolbar: ({ controls }: { controls: unknown }) => controls
}));
jest.mock('@/core/components/dashboards/kit/period-picker', () => ({ PeriodPicker: () => null }));
jest.mock('./time-activity-filter-menu', () => ({
	TimeActivityFilterMenu: () => null,
	AppliedTimeActivityFilters: () => null
}));
jest.mock('./time-activity-view-menu', () => ({ TimeActivityViewMenu: () => null }));

import { TimeActivityToolbar } from './time-activity-toolbar';

const GROUPINGS: TimeActivityGrouping[] = ['date', 'member', 'project', 'task', 'week', 'client'];

/** The switch at 375 px as the browser lays it out: a 343 px scroller over 389 px of options. */
const SCROLLER = { left: 12, width: 343, contentWidth: 389 };
const FOCUS_RING = 3;
const TABS: Record<string, { left: number; width: number }> = {
	'dashboard.timeActivity.grouping.DATE': { left: 18, width: 53 },
	'dashboard.timeActivity.grouping.MEMBER': { left: 73, width: 75 },
	'dashboard.timeActivity.grouping.PROJECT': { left: 150, width: 68 },
	'dashboard.timeActivity.grouping.TASK': { left: 220, width: 52 },
	'dashboard.timeActivity.grouping.WEEK': { left: 275, width: 58 },
	'common.CLIENT': { left: 335, width: 60 }
};

function rectOf(left: number, width: number) {
	const rect = { x: left, y: 0, left, top: 0, width, height: 28, right: left + width, bottom: 28 };
	return { ...rect, toJSON: () => rect } as DOMRect;
}

function isScroller(element: Element) {
	return element.classList.contains('overflow-x-auto');
}

function scrollOf(element: Element) {
	const scroller = element.closest('.overflow-x-auto');
	if (!scroller) {
		return 0;
	}
	return scroller.scrollLeft;
}

function layoutBoxOf(element: Element) {
	if (isScroller(element)) {
		return rectOf(SCROLLER.left, SCROLLER.width);
	}
	const tab = TABS[element.textContent ?? ''];
	const isTab = element.getAttribute('role') === 'tab';
	if (!isTab || !tab) {
		return rectOf(0, 0);
	}
	return rectOf(tab.left - scrollOf(element), tab.width);
}

function clientWidthOf(element: Element) {
	if (isScroller(element)) {
		return SCROLLER.width;
	}
	return 0;
}

function scrollWidthOf(element: Element) {
	if (isScroller(element)) {
		return SCROLLER.contentWidth;
	}
	return 0;
}

function reportOf(grouping: TimeActivityGrouping) {
	const settings = {
		groupings: GROUPINGS,
		grouping,
		setGrouping: jest.fn(),
		filters: {},
		activeFilterCount: 0,
		setFilterValues: jest.fn(),
		clearFilters: jest.fn(),
		removeFilterValue: jest.fn(),
		hiddenColumns: [],
		toggleColumn: jest.fn(),
		clientGroupingAccess: 'granted'
	};
	const report = {
		settings,
		period: { from: new Date(2026, 10, 7), to: new Date(2026, 10, 13) },
		setPeriod: jest.fn(),
		isDailyPending: false,
		isUpdating: false,
		isManager: true,
		totals: { memberCount: 1 }
	};
	return report as unknown as TimeActivityReport;
}

/** The tab shows whole, its focus ring included, inside the switch's visible width. */
function expectWholeInView(name: string) {
	const box = screen.getByRole('tab', { name }).getBoundingClientRect();
	expect(box.left - FOCUS_RING).toBeGreaterThanOrEqual(SCROLLER.left);
	expect(box.right + FOCUS_RING).toBeLessThanOrEqual(SCROLLER.left + SCROLLER.width);
}

function scrollerOfSwitch() {
	const scroller = screen.getByRole('tablist').closest('.overflow-x-auto');
	if (!scroller) {
		throw new Error('the switch has no scroller');
	}
	return scroller;
}

describe('TimeActivityToolbar grouping switch on a narrow screen', () => {
	beforeEach(() => {
		// The smooth scroll of a later pick asks `window.matchMedia` about reduced motion, which jsdom does not provide.
		window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
		jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function boxOf(this: Element) {
			return layoutBoxOf(this);
		});
		jest.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function widthOf(this: Element) {
			return clientWidthOf(this);
		});
		jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function contentOf(this: Element) {
			return scrollWidthOf(this);
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('opens with the picked grouping whole in view when it sits past the edge (a link on Client)', () => {
		render(<TimeActivityToolbar report={reportOf('client')} />);

		expectWholeInView('common.CLIENT');
	});

	it('brings each new pick into view: back to Date, the switch returns to its start', () => {
		const { rerender } = render(<TimeActivityToolbar report={reportOf('client')} />);
		rerender(<TimeActivityToolbar report={reportOf('date')} />);

		expectWholeInView('dashboard.timeActivity.grouping.DATE');
		expect(scrollerOfSwitch().scrollLeft).toBe(0);
	});

	it('leaves the switch where it is when the pick already shows', () => {
		render(<TimeActivityToolbar report={reportOf('member')} />);

		expect(scrollerOfSwitch().scrollLeft).toBe(0);
	});
});
