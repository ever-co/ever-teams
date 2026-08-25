/**
 * @jest-environment jsdom
 */
import { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { activeTeamIdState, organizationTeamsState, publicState } from '@/core/stores';
import {
	TASK_METADATA_SECTIONS,
	TaskMetadataBootstrapResponse,
	TaskMetadataScope
} from '@/core/types/interfaces/task/task-metadata-bootstrap';

const mockBundle = jest.fn();
const mockStatuses = jest.fn();
const mockPriorities = jest.fn();
const mockSizes = jest.fn();
const mockLabels = jest.fn();
const mockVersions = jest.fn();
const mockIssueTypes = jest.fn();
const mockRelatedIssueTypes = jest.fn();

jest.mock('@/core/services/client/api/tasks/task-metadata-bootstrap.service', () => ({
	taskMetadataBootstrapService: {
		getTaskMetadataBootstrap: (...args: unknown[]) => mockBundle(...args)
	}
}));
jest.mock('@/core/services/client/api/tasks/task-status.service', () => ({
	taskStatusService: { getTaskStatuses: (...args: unknown[]) => mockStatuses(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task-priority.service', () => ({
	taskPriorityService: { getTaskPrioritiesList: (...args: unknown[]) => mockPriorities(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task-size.service', () => ({
	taskSizeService: { getTaskSizes: (...args: unknown[]) => mockSizes(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task-label.service', () => ({
	taskLabelService: { getTaskLabelsList: (...args: unknown[]) => mockLabels(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task-version.service', () => ({
	taskVersionService: { getTaskVersions: (...args: unknown[]) => mockVersions(...args) }
}));
jest.mock('@/core/services/client/api/tasks/issue-type.service', () => ({
	issueTypeService: { getIssueTypeList: (...args: unknown[]) => mockIssueTypes(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task-related-issue-type.service', () => ({
	taskRelatedIssueTypeService: {
		getTaskRelatedIssueTypeList: (...args: unknown[]) => mockRelatedIssueTypes(...args)
	}
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-1',
			employee: { tenantId: 'tenant-1', organizationId: 'organization-1' }
		}
	})
}));
jest.mock('../common/use-first-load', () => ({
	useFirstLoad: () => ({ firstLoadData: jest.fn() })
}));

// Load the schema barrel first to retain the application's working evaluation order.
require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskStatusesQuery } = require('./use-task-statuses-query') as typeof import('./use-task-statuses-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskPrioritiesQuery } =
	require('./use-task-priorities-query') as typeof import('./use-task-priorities-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskSizesQuery } = require('./use-task-sizes-query') as typeof import('./use-task-sizes-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskLabelsQuery } = require('./use-task-labels-query') as typeof import('./use-task-labels-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskVersionsQuery } = require('./use-task-versions-query') as typeof import('./use-task-versions-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useIssueTypesQuery } = require('./use-issue-types-query') as typeof import('./use-issue-types-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTaskRelatedIssueTypesQuery } =
	require('./use-task-related-issue-types-query') as typeof import('./use-task-related-issue-types-query');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskStatuses } =
	require('./use-invalidate-task-statuses') as typeof import('./use-invalidate-task-statuses');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskPriorities } =
	require('./use-invalidate-task-priorities') as typeof import('./use-invalidate-task-priorities');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskSizes } =
	require('./use-invalidate-task-sizes') as typeof import('./use-invalidate-task-sizes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskLabels } =
	require('./use-invalidate-task-labels') as typeof import('./use-invalidate-task-labels');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskVersions } =
	require('./use-invalidate-task-versions') as typeof import('./use-invalidate-task-versions');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateIssueTypes } =
	require('./use-invalidate-issue-types') as typeof import('./use-invalidate-issue-types');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useInvalidateTaskRelatedIssueTypes } =
	require('./use-invalidate-task-related-issue-types') as typeof import('./use-invalidate-task-related-issue-types');

const scope: TaskMetadataScope = {
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1'
};

const sections = {
	taskStatuses: { items: [{ id: 'status-1', name: 'Open' }], total: 1 },
	taskPriorities: { items: [{ id: 'priority-1', name: 'High' }], total: 1 },
	taskSizes: { items: [{ id: 'size-1', name: 'Large' }], total: 1 },
	taskLabels: { items: [{ id: 'label-1', name: 'Bug' }], total: 1 },
	taskVersions: { items: [{ id: 'version-1', name: '1.0' }], total: 1 },
	issueTypes: { items: [{ id: 'issue-1', name: 'Task' }], total: 1 },
	relatedIssueTypes: { items: [{ id: 'related-1', name: 'Blocks' }], total: 1 }
} as unknown as TaskMetadataBootstrapResponse;

function useAllMetadataFacades() {
	return {
		statuses: useTaskStatusesQuery(),
		priorities: useTaskPrioritiesQuery(),
		sizes: useTaskSizesQuery(),
		labels: useTaskLabelsQuery(),
		versions: useTaskVersionsQuery(),
		issueTypes: useIssueTypesQuery(),
		relatedIssueTypes: useTaskRelatedIssueTypesQuery()
	};
}

function useAllMetadataInvalidators() {
	return {
		statuses: useInvalidateTaskStatuses().invalidateTaskStatusesData,
		priorities: useInvalidateTaskPriorities().invalidateTaskPrioritiesData,
		sizes: useInvalidateTaskSizes().invalidateTaskSizesData,
		labels: useInvalidateTaskLabels().invalidateTaskLabelsData,
		versions: useInvalidateTaskVersions().invalidateTaskVersionsData,
		issueTypes: useInvalidateIssueTypes().invalidateIssueTypesData,
		relatedIssueTypes: useInvalidateTaskRelatedIssueTypes().invalidateTaskRelatedIssueTypesData
	};
}

function createHarness(publicTeam = false) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	});
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1' }] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(publicState, publicTeam);

	return {
		queryClient,
		wrapper: ({ children }: { children: ReactNode }) => (
			<JotaiProvider store={store}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</JotaiProvider>
		)
	};
}

function arrangeLegacySuccesses() {
	mockStatuses.mockResolvedValue(sections.taskStatuses);
	mockPriorities.mockResolvedValue(sections.taskPriorities);
	mockSizes.mockResolvedValue(sections.taskSizes);
	mockLabels.mockResolvedValue({ data: sections.taskLabels });
	mockVersions.mockResolvedValue(sections.taskVersions);
	mockIssueTypes.mockResolvedValue({ data: sections.issueTypes });
	mockRelatedIssueTypes.mockResolvedValue({ data: sections.relatedIssueTypes });
}

function expectSevenLegacyReads() {
	expect(mockStatuses).toHaveBeenCalledTimes(1);
	expect(mockPriorities).toHaveBeenCalledTimes(1);
	expect(mockSizes).toHaveBeenCalledTimes(1);
	expect(mockLabels).toHaveBeenCalledTimes(1);
	expect(mockVersions).toHaveBeenCalledTimes(1);
	expect(mockIssueTypes).toHaveBeenCalledTimes(1);
	expect(mockRelatedIssueTypes).toHaveBeenCalledTimes(1);
}

function expectNoLegacyReads() {
	expect(mockStatuses).not.toHaveBeenCalled();
	expect(mockPriorities).not.toHaveBeenCalled();
	expect(mockSizes).not.toHaveBeenCalled();
	expect(mockLabels).not.toHaveBeenCalled();
	expect(mockVersions).not.toHaveBeenCalled();
	expect(mockIssueTypes).not.toHaveBeenCalled();
	expect(mockRelatedIssueTypes).not.toHaveBeenCalled();
}

describe('shared task metadata facade query', () => {
	beforeEach(() => {
		document.cookie = 'auth-active-team=team-1; path=/';
		mockBundle.mockReset();
		mockStatuses.mockReset();
		mockPriorities.mockReset();
		mockSizes.mockReset();
		mockLabels.mockReset();
		mockVersions.mockReset();
		mockIssueTypes.mockReset();
		mockRelatedIssueTypes.mockReset();
		arrangeLegacySuccesses();
	});

	it('coalesces seven authenticated facades onto one canonical full-scope request', async () => {
		mockBundle.mockResolvedValue(sections);
		const { queryClient, wrapper } = createHarness();
		const { result } = renderHook(useAllMetadataFacades, { wrapper });

		await waitFor(() => expect(result.current.relatedIssueTypes.taskRelatedIssueTypes).toHaveLength(1));

		expect(mockBundle).toHaveBeenCalledTimes(1);
		expect(mockBundle).toHaveBeenCalledWith(scope, TASK_METADATA_SECTIONS, expect.any(AbortSignal));
		expectNoLegacyReads();
		expect(result.current.statuses.taskStatuses).toEqual(sections.taskStatuses?.items);
		expect(result.current.priorities.taskPriorities).toEqual(sections.taskPriorities?.items);
		expect(result.current.sizes.taskSizes).toEqual(sections.taskSizes?.items);
		expect(result.current.labels.actualTaskLabels).toEqual(sections.taskLabels?.items);
		expect(result.current.versions.taskVersions).toEqual(sections.taskVersions?.items);
		expect(result.current.issueTypes.issueTypes).toEqual(sections.issueTypes?.items);
		expect(result.current.relatedIssueTypes.taskRelatedIssueTypes).toEqual(sections.relatedIssueTypes?.items);
		expect(typeof result.current.statuses.setTaskStatuses).toBe('function');
		expect(typeof result.current.priorities.setTaskPriorities).toBe('function');
		expect(typeof result.current.sizes.setTaskSizes).toBe('function');
		expect(typeof result.current.labels.setTaskLabels).toBe('function');
		expect(typeof result.current.labels.addOptimisticLabel).toBe('function');
		expect(typeof result.current.versions.loadTaskVersionData).toBe('function');
		expect(typeof result.current.issueTypes.loadIssueTypes).toBe('function');
		expect(typeof result.current.relatedIssueTypes.loadTaskRelatedIssueTypeData).toBe('function');

		const query = queryClient.getQueryCache().find({
			queryKey: queryKeys.taskMetadata.bootstrap(scope, TASK_METADATA_SECTIONS),
			exact: true
		});
		const options = query?.options as { staleTime?: number; gcTime?: number } | undefined;
		expect(options?.staleTime).toBe(5 * 60 * 1000);
		expect(options?.gcTime).toBe(15 * 60 * 1000);
	});

	it('keeps public mode on the seven public byTeam reads', async () => {
		const { wrapper } = createHarness(true);
		const { result } = renderHook(useAllMetadataFacades, { wrapper });

		await waitFor(() => expect(result.current.statuses.taskStatuses).toHaveLength(1));

		expect(mockBundle).not.toHaveBeenCalled();
		expectSevenLegacyReads();
	});

	it('propagates the accepted service fallback result without mounting duplicate legacy queries', async () => {
		mockBundle.mockImplementation(async () => {
			const [taskStatuses, taskPriorities, taskSizes, taskLabels, taskVersions, issueTypes, relatedIssueTypes] =
				await Promise.all([
					mockStatuses(),
					mockPriorities(),
					mockSizes(),
					mockLabels().then((response: { data: unknown }) => response.data),
					mockVersions(),
					mockIssueTypes().then((response: { data: unknown }) => response.data),
					mockRelatedIssueTypes().then((response: { data: unknown }) => response.data)
				]);
			return { taskStatuses, taskPriorities, taskSizes, taskLabels, taskVersions, issueTypes, relatedIssueTypes };
		});
		const { wrapper } = createHarness();
		const { result } = renderHook(useAllMetadataFacades, { wrapper });

		await waitFor(() => expect(result.current.versions.taskVersions).toHaveLength(1));

		expect(mockBundle).toHaveBeenCalledTimes(1);
		expectSevenLegacyReads();
	});

	it('does not fan out legacy queries when the bundle service rejects a non-fallback failure', async () => {
		mockBundle.mockRejectedValue(new Error('HTTP 500'));
		const { queryClient, wrapper } = createHarness();
		renderHook(useAllMetadataFacades, { wrapper });
		const key = queryKeys.taskMetadata.bootstrap(scope, TASK_METADATA_SECTIONS);

		await waitFor(() => expect(queryClient.getQueryState(key)?.status).toBe('error'));

		expect(mockBundle).toHaveBeenCalledTimes(1);
		expectNoLegacyReads();
	});

	it('does not let a canonical partial cache entry satisfy the full facade key', async () => {
		mockBundle.mockResolvedValue(sections);
		const { queryClient, wrapper } = createHarness();
		const partialKey = queryKeys.taskMetadata.bootstrap(scope, ['taskStatuses']);
		const partial = { taskStatuses: { items: [{ id: 'partial-status' }], total: 1 } };
		queryClient.setQueryData(partialKey, partial);

		const { result } = renderHook(useAllMetadataFacades, { wrapper });
		await waitFor(() => expect(result.current.statuses.taskStatuses).toEqual(sections.taskStatuses?.items));

		expect(mockBundle).toHaveBeenCalledTimes(1);
		expect(queryClient.getQueryData(partialKey)).toEqual(partial);
		expect(queryClient.getQueryData(queryKeys.taskMetadata.bootstrap(scope))).toEqual(sections);
	});

	it('wires every existing mutation invalidator to its bundle, scoped, and legacy cache keys', async () => {
		const { queryClient, wrapper } = createHarness();
		const targets = [
			['taskStatuses', queryKeys.taskStatuses.byScope(scope), queryKeys.taskStatuses.byTeam('team-1')],
			['taskPriorities', queryKeys.taskPriorities.byScope(scope), queryKeys.taskPriorities.byTeam('team-1')],
			['taskSizes', queryKeys.taskSizes.byScope(scope), queryKeys.taskSizes.byTeam('team-1')],
			['taskLabels', queryKeys.taskLabels.byScope(scope), queryKeys.taskLabels.byTeam('team-1')],
			['taskVersions', queryKeys.taskVersions.byScope(scope), queryKeys.taskVersions.byTeam('team-1')],
			['issueTypes', queryKeys.issueTypes.byScope(scope), queryKeys.issueTypes.byTeam('team-1')],
			[
				'relatedIssueTypes',
				queryKeys.taskRelatedIssueTypes.byScope(scope),
				queryKeys.taskRelatedIssueTypes.byTeam('team-1')
			]
		] as const;
		targets.forEach(([section, scopedKey, legacyKey]) => {
			queryClient.setQueryData(queryKeys.taskMetadata.bootstrap(scope, [section]), {
				[section]: { items: [], total: 0 }
			});
			queryClient.setQueryData(scopedKey, { items: [], total: 0 });
			queryClient.setQueryData(legacyKey, { items: [], total: 0 });
		});
		const { result } = renderHook(useAllMetadataInvalidators, { wrapper });

		await act(async () => {
			await Promise.all(Object.values(result.current).map((invalidate) => invalidate()));
		});

		targets.forEach(([section, scopedKey, legacyKey]) => {
			expect(queryClient.getQueryState(queryKeys.taskMetadata.bootstrap(scope, [section]))?.isInvalidated).toBe(
				true
			);
			expect(queryClient.getQueryState(scopedKey)?.isInvalidated).toBe(true);
			expect(queryClient.getQueryState(legacyKey)?.isInvalidated).toBe(true);
		});
	});
});
