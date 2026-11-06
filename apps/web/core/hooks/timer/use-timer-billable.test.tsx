/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, activeTeamTaskState, organizationTeamsState } from '@/core/stores';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => 'token',
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('../auth/use-reactive-access-token-cookie', () => ({ useReactiveAccessTokenCookie: () => 'token' }));
jest.mock('../organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: [
			{ id: 'project-default', billable: true },
			{ id: 'project-internal', billable: false }
		]
	})
}));
jest.mock('@/core/services/client/api/organizations', () => ({ organizationProjectService: {} }));

import { useTimerBillable } from './use-timer-billable';

function renderBillableOf(task: { id: string; projectId: string | null }) {
	const store = createStore();
	const team = { id: 'team-a', name: 'Team A', members: [], defaultProjectId: 'project-default', projects: [] };
	store.set(organizationTeamsState, [team] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(activeTeamTaskState, task as never);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTimerBillable(), { wrapper }).result.current.isBillable;
}

describe('useTimerBillable', () => {
	it("shows the billable value of the team's default project for a task saved without a project", () => {
		expect(renderBillableOf({ id: 'task-a', projectId: null })).toBe(true);
	});

	it("keeps the value of the task's own project", () => {
		expect(renderBillableOf({ id: 'task-a', projectId: 'project-internal' })).toBe(false);
	});
});
