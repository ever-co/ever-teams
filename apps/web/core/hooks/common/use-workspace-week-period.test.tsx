/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import type { Period, WeekStart } from '@/core/lib/utils/dashboard-period';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useWorkspaceWeekPeriod } from './use-workspace-week-period';

/** A period whose first day is the week start it was built for: 1 November 2026 plus that many days. */
function periodStartingOn(weekStart: WeekStart): Period {
	const from = new Date(2026, 10, 1 + weekStart);
	return { from, to: from };
}

function renderWeekPeriod(startWeekOn: string | null) {
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization-a', startWeekOn } as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useWorkspaceWeekPeriod(periodStartingOn), { wrapper });
	return { view, store };
}

describe('useWorkspaceWeekPeriod', () => {
	it("opens on the default period of the workspace's week start", () => {
		const { view } = renderWeekPeriod('SUNDAY');

		expect(view.result.current[0].from.getDate()).toBe(1);
	});

	it('follows a week start read or saved after the page opened, until the person picks a period', () => {
		const { view, store } = renderWeekPeriod(null);
		expect(view.result.current[0].from.getDate()).toBe(2);

		act(() => {
			store.set(currentOrganizationState, { id: 'organization-a', startWeekOn: 'SATURDAY' } as never);
		});

		expect(view.result.current[0].from.getDate()).toBe(7);
	});

	it('keeps the period the person picked, and passes the shown one to an update', () => {
		const { view, store } = renderWeekPeriod('MONDAY');
		const picked = { from: new Date(2026, 9, 5), to: new Date(2026, 9, 9) };

		act(() => {
			view.result.current[1]((shown) => ({ ...picked, to: shown.to }));
		});
		act(() => {
			store.set(currentOrganizationState, { id: 'organization-a', startWeekOn: 'SUNDAY' } as never);
		});

		expect(view.result.current[0].from).toEqual(picked.from);
		expect(view.result.current[0].to.getDate()).toBe(2);
	});
});
