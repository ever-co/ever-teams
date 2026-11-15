/** @jest-environment jsdom */
/**
 * "Use … in every tab" (#5134) moves the shared cookies and the session back to this tab's organization, and nothing
 * else: the tab's team, its task and its project stay as they are.
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';

const mockScope = {
	held: true,
	isOtherOrganizationOpen: true,
	organizationId: 'org-a',
	teamId: 'team-a',
	projectId: 'project-a2',
	sharedOrganizationId: 'org-b',
	accessToken: 'token-of-a'
};
const mockCookieWrites: string[] = [];
const mockSyncTokenOrganization = jest.fn(async (_organizationId: string) => true);

jest.mock('@/core/lib/auth/tab-organization', () => ({
	TAB_SCOPE_CHANGED_EVENT: 'ever-teams:tab-scope-changed',
	tabScope: () => mockScope
}));
jest.mock('@/core/lib/auth/token-organization', () => ({
	syncTokenOrganization: (organizationId: string) => mockSyncTokenOrganization(organizationId)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setOrganizationIdCookie: (id: string) => mockCookieWrites.push(`organization=${id}`),
	setActiveTeamIdCookie: (id: string) => mockCookieWrites.push(`team=${id}`),
	setActiveProjectIdCookie: (id: string) => mockCookieWrites.push(`project=${id}`)
}));

import { activeTeamTaskState, teamTasksState } from '@/core/stores';
import { useTabOrganization } from './use-tab-organization';

function renderTab() {
	const store = createStore();
	const task = { id: 'task-a', title: 'The task this tab works on' };
	store.set(activeTeamTaskState, task as never);
	store.set(teamTasksState, [task] as never);
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(() => useTabOrganization(), { wrapper });
	return { store, task, view };
}

beforeEach(() => {
	mockCookieWrites.length = 0;
	mockSyncTokenOrganization.mockClear();
	mockScope.isOtherOrganizationOpen = true;
});

describe('useTabOrganization, bringing the tab organization back', () => {
	it('moves the cookies and the session back, organization first, and keeps the task and project of the tab', async () => {
		const { store, task, view } = renderTab();

		await act(async () => {
			view.result.current.bringOwnOrganizationBack();
		});

		expect(mockCookieWrites).toEqual(['organization=org-a', 'team=team-a', 'project=project-a2']);
		expect(mockSyncTokenOrganization).toHaveBeenCalledWith('org-a');
		// A team switch would have cleared them
		expect(store.get(activeTeamTaskState)).toBe(task);
		expect(store.get(teamTasksState)).toEqual([task]);
	});

	it('does nothing while no other organization is open in another tab', async () => {
		mockScope.isOtherOrganizationOpen = false;
		const { view } = renderTab();

		await act(async () => {
			view.result.current.bringOwnOrganizationBack();
		});

		expect(mockCookieWrites).toEqual([]);
		expect(mockSyncTokenOrganization).not.toHaveBeenCalled();
	});
});
