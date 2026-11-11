/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState, teamTasksState } from '@/core/stores';
import type { IIntegrationSyncConflict } from '@/core/types/interfaces/integrations/integration-sync-conflict';

jest.mock('@/core/services/client/api/integrations/linear.service', () => ({
	linearIntegrationService: { conflicts: jest.fn(), resolveConflict: jest.fn() }
}));
jest.mock('@/core/services/client/api/integrations/asana.service', () => ({
	asanaIntegrationService: { conflicts: jest.fn(), resolveConflict: jest.fn() }
}));
jest.mock('@/core/services/client/api/integrations/trello.service', () => ({
	trelloIntegrationService: { conflicts: jest.fn(), resolveConflict: jest.fn() }
}));

import { asanaIntegrationService } from '@/core/services/client/api/integrations/asana.service';
import { linearIntegrationService } from '@/core/services/client/api/integrations/linear.service';
import {
	CONFLICTS_PAGE,
	useConflictsAfterRuns,
	useIntegrationConflicts,
	type IntegrationConflictsOptions
} from './use-integration-conflicts';

const linear = jest.mocked(linearIntegrationService);
const asana = jest.mocked(asanaIntegrationService);

function conflict(overrides: Partial<IIntegrationSyncConflict> = {}): IIntegrationSyncConflict {
	return {
		id: 'c-1',
		integrationId: 'int-1',
		mappingId: 'map-1',
		runId: 'run-1',
		taskId: 'task-1',
		sourceId: 'issue-1',
		field: 'status',
		syncedValue: 'open',
		platformValue: 'in-progress',
		externalValue: 'done',
		status: 'open',
		resolution: null,
		resolvedAt: null,
		resolvedByUserId: null,
		createdAt: '2026-11-11T08:00:00.000Z',
		...overrides
	};
}

function setup(options: Partial<IntegrationConflictsOptions> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(organizationTeamsState, [
		{ id: 'team-1', tenantId: 'tenant-1', organizationId: 'org-1', members: [], projects: [] } as never
	]);
	store.set(activeTeamIdState, 'team-1');
	store.set(teamTasksState, [{ id: 'task-1', title: 'Fix login' } as never]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const hook = renderHook((props: IntegrationConflictsOptions) => useIntegrationConflicts(props), {
		wrapper,
		initialProps: { provider: 'linear', integrationId: 'int-1', status: 'open', runId: null, ...options }
	});
	return { ...hook, client };
}

describe('useIntegrationConflicts', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("reads the provider's open conflicts, with the run filter, and nothing without a connection", async () => {
		linear.conflicts.mockResolvedValue([conflict()]);
		const { result, rerender } = setup();
		await waitFor(() => expect(result.current.conflicts).toHaveLength(1));
		expect(linear.conflicts).toHaveBeenCalledWith(
			'int-1',
			{ status: 'open', runId: null, take: 50 },
			expect.anything()
		);

		rerender({ provider: 'linear', integrationId: 'int-1', status: 'open', runId: 'run-2' });
		await waitFor(() =>
			expect(linear.conflicts).toHaveBeenLastCalledWith(
				'int-1',
				{ status: 'open', runId: 'run-2', take: 50 },
				expect.anything()
			)
		);

		linear.conflicts.mockClear();
		rerender({ provider: 'linear', integrationId: null, status: 'open', runId: null });
		expect(result.current.isLoading).toBe(false);
		expect(linear.conflicts).not.toHaveBeenCalled();
	});

	it("goes to the provider's own client", async () => {
		asana.conflicts.mockResolvedValue([]);
		const { result } = setup({ provider: 'asana' });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(asana.conflicts).toHaveBeenCalledWith(
			'int-1',
			{ status: 'open', runId: null, take: 50 },
			expect.anything()
		);
		expect(linear.conflicts).not.toHaveBeenCalled();
	});

	it("names a task by the team's tasks, or by a title conflict's applied value", async () => {
		linear.conflicts.mockResolvedValue([]);
		const { result } = setup();
		expect(result.current.titleOf(conflict())).toBe('Fix login');
		expect(
			result.current.titleOf(conflict({ taskId: 'task-9', field: 'title', externalValue: ' New title ' }))
		).toBe('New title');
		expect(result.current.titleOf(conflict({ taskId: 'task-9' }))).toBeNull();
	});

	it('resolves a conflict: it leaves the open list at once and the lists are read again', async () => {
		linear.conflicts
			.mockResolvedValueOnce([conflict(), conflict({ id: 'c-2' })])
			.mockResolvedValue([conflict({ id: 'c-2' })]);
		linear.resolveConflict.mockResolvedValue(conflict({ status: 'resolved', resolution: 'kept_platform' }));
		const { result } = setup();
		await waitFor(() => expect(result.current.conflicts).toHaveLength(2));

		await act(() => result.current.resolve('c-1', 'platform'));

		expect(linear.resolveConflict).toHaveBeenCalledWith('int-1', 'c-1', 'platform');
		expect(result.current.conflicts.map((item) => item.id)).toEqual(['c-2']);
		expect(result.current.resolved).toBe('platform');
		expect(result.current.resolveError).toBeNull();
		expect(result.current.resolvingId).toBeNull();
		await waitFor(() => expect(linear.conflicts).toHaveBeenCalledTimes(2));
	});

	it('the task changed since (409): the conflict stays and the refusal says so', async () => {
		linear.conflicts.mockResolvedValue([conflict()]);
		linear.resolveConflict.mockRejectedValue({
			response: { status: 409, data: { code: 'LINEAR_CONFLICT_STALE' } }
		});
		const { result } = setup();
		await waitFor(() => expect(result.current.conflicts).toHaveLength(1));

		await act(() => result.current.resolve('c-1', 'platform'));

		expect(result.current.resolveError?.refusal).toBe('stale');
		expect(result.current.conflicts).toHaveLength(1);
		expect(linear.conflicts).toHaveBeenCalledTimes(1);

		act(() => result.current.clearFeedback());
		expect(result.current.resolveError).toBeNull();
	});

	it('resolved elsewhere already (404): the lists are read again', async () => {
		linear.conflicts.mockResolvedValueOnce([conflict()]).mockResolvedValue([]);
		linear.resolveConflict.mockRejectedValue({ response: { status: 404 } });
		const { result } = setup();
		await waitFor(() => expect(result.current.conflicts).toHaveLength(1));

		await act(() => result.current.resolve('c-1', 'external'));

		expect(result.current.resolveError?.refusal).toBe('notFound');
		await waitFor(() => expect(result.current.conflicts).toHaveLength(0));
	});

	it('a full page offers more, read with a longer page; another run starts from the newest page again', async () => {
		const full = Array.from({ length: CONFLICTS_PAGE }, (_, index) => conflict({ id: `c-${index}` }));
		linear.conflicts.mockResolvedValue(full);
		const { result, rerender } = setup();
		await waitFor(() => expect(result.current.conflicts).toHaveLength(CONFLICTS_PAGE));
		expect(result.current.canShowMore).toBe(true);

		act(() => result.current.showMore());
		await waitFor(() =>
			expect(linear.conflicts).toHaveBeenLastCalledWith(
				'int-1',
				{ status: 'open', runId: null, take: CONFLICTS_PAGE * 2 },
				expect.anything()
			)
		);
		// Fewer than asked: that is all of them.
		await waitFor(() => expect(result.current.canShowMore).toBe(false));

		rerender({ provider: 'linear', integrationId: 'int-1', status: 'open', runId: 'run-2' });
		await waitFor(() =>
			expect(linear.conflicts).toHaveBeenLastCalledWith(
				'int-1',
				{ status: 'open', runId: 'run-2', take: CONFLICTS_PAGE },
				expect.anything()
			)
		);
	});

	it('a run that finishes, while another still runs, reads the conflict lists again', async () => {
		const client = new QueryClient();
		const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const running = [
			{ id: 'r1', status: 'running' },
			{ id: 'r2', status: 'running' }
		];
		const { rerender } = renderHook(({ runs }) => useConflictsAfterRuns('asana', runs), {
			wrapper,
			initialProps: { runs: running }
		});
		expect(invalidate).not.toHaveBeenCalled();

		rerender({
			runs: [
				{ id: 'r1', status: 'done' },
				{ id: 'r2', status: 'running' }
			]
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['integrations', 'asana', 'conflicts'] });

		invalidate.mockClear();
		rerender({
			runs: [
				{ id: 'r1', status: 'done' },
				{ id: 'r2', status: 'running' },
				{ id: 'r3', status: 'running' }
			]
		});
		expect(invalidate).not.toHaveBeenCalled();
	});
});
