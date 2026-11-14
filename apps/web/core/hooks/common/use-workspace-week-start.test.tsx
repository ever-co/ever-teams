/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useWorkspaceWeekStart } from './use-workspace-week-start';

function renderWeekStart(organization: object | null) {
	const store = createStore();
	store.set(currentOrganizationState, organization as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useWorkspaceWeekStart(), { wrapper });
	return { view, store };
}

describe('useWorkspaceWeekStart', () => {
	it('starts the week on the day the organization stores', () => {
		expect(renderWeekStart({ id: 'organization-a', startWeekOn: 'SUNDAY' }).view.result.current).toBe(0);
		expect(renderWeekStart({ id: 'organization-a', startWeekOn: 'SATURDAY' }).view.result.current).toBe(6);
	});

	it('starts the week on Monday until the organization is read, or when it stores no day', () => {
		expect(renderWeekStart(null).view.result.current).toBe(1);
		expect(renderWeekStart({ id: 'organization-a', startWeekOn: null }).view.result.current).toBe(1);
	});

	it('follows a week start saved while the page is open', () => {
		const organization = { id: 'organization-a', startWeekOn: 'MONDAY' };
		const { view, store } = renderWeekStart(organization);

		act(() => {
			store.set(currentOrganizationState, { ...organization, startWeekOn: 'SUNDAY' } as never);
		});

		expect(view.result.current).toBe(0);
	});
});
