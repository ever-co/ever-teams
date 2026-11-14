/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useTimeActivityWeek } from './use-time-activity-week';

jest.mock('next-intl', () => ({ useLocale: () => 'en' }));
jest.mock('@/core/hooks/activities/queries/use-activity-weekly-report-query', () => ({
	useActivityWeeklyReportQuery: () => ({ weeklyReport: [], isLoading: false, isError: false, refetch: jest.fn() })
}));

/** December 2026 starts on a Tuesday: its Monday weeks start on 30 November, its Sunday weeks on 29 November. */
const DECEMBER = { from: new Date(2026, 11, 1), to: new Date(2026, 11, 31, 23, 59, 59) };

/** Sunday 13 December: the second Monday week of the month, but the third Sunday week. */
const SUNDAY_13_DECEMBER = new Date(2026, 11, 13, 12);

function renderWeek(startWeekOn: string | null) {
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization-a', startWeekOn } as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(
		() => useTimeActivityWeek({ period: DECEMBER, request: null, userId: undefined, dailySource: null }),
		{ wrapper }
	);
	return { view, store };
}

describe('useTimeActivityWeek', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: SUNDAY_13_DECEMBER });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("opens on the week holding today in the workspace's week start", () => {
		const { view } = renderWeek('SUNDAY');

		expect(localDayKeyOf(view.result.current.weekStart)).toBe('2026-12-13');
	});

	it('reopens the week holding today when the week start is read after the grid opened', () => {
		const { view, store } = renderWeek(null);
		expect(localDayKeyOf(view.result.current.weekStart)).toBe('2026-12-07');

		act(() => {
			store.set(currentOrganizationState, { id: 'organization-a', startWeekOn: 'SUNDAY' } as never);
		});

		expect(localDayKeyOf(view.result.current.weekStart)).toBe('2026-12-13');
	});

	it('moves from the week on screen, and keeps the week the person moved to', () => {
		const { view } = renderWeek('SUNDAY');

		act(() => {
			view.result.current.goPrevious();
		});
		expect(localDayKeyOf(view.result.current.weekStart)).toBe('2026-12-06');

		act(() => {
			view.result.current.goNext();
		});
		expect(localDayKeyOf(view.result.current.weekStart)).toBe('2026-12-13');
		expect(view.result.current.canGoNext).toBe(false);
	});
});
