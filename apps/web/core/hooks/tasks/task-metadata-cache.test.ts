import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TaskMetadataScope, TaskMetadataSection } from '@/core/types/interfaces/task/task-metadata-bootstrap';
import { invalidateTaskMetadataSectionCaches, updateTaskMetadataSectionCaches } from './task-metadata-cache';

const scope: TaskMetadataScope = {
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1',
	projectId: 'project-1'
};
const otherScope: TaskMetadataScope = {
	...scope,
	organizationTeamId: 'team-2'
};

describe('task metadata cache helpers', () => {
	it('updates matching full/partial bundles and scoped/legacy keys without dropping totals or siblings', () => {
		const queryClient = new QueryClient();
		const fullKey = queryKeys.taskMetadata.bootstrap(scope);
		const matchingPartialKey = queryKeys.taskMetadata.bootstrap(scope, ['taskLabels', 'taskStatuses']);
		const unrelatedPartialKey = queryKeys.taskMetadata.bootstrap(scope, ['taskStatuses']);
		const otherScopeKey = queryKeys.taskMetadata.bootstrap(otherScope);
		const full = {
			taskLabels: { items: [{ id: 'old' }], total: 17 },
			taskStatuses: { items: [{ id: 'status' }], total: 9 }
		};
		queryClient.setQueryData(fullKey, full);
		queryClient.setQueryData(matchingPartialKey, full);
		queryClient.setQueryData(unrelatedPartialKey, { taskStatuses: full.taskStatuses });
		queryClient.setQueryData(otherScopeKey, full);
		queryClient.setQueryData(queryKeys.taskLabels.byScope(scope), { items: [{ id: 'old' }], total: 4 });
		queryClient.setQueryData(queryKeys.taskLabels.byTeam('team-1'), { items: [{ id: 'old' }], total: 6 });

		const updater = jest.fn((previous: Array<{ id: string }>) => [{ id: 'new' }, ...previous]);
		updateTaskMetadataSectionCaches(queryClient, { section: 'taskLabels', scope, teamId: 'team-1' }, updater);

		expect(updater).toHaveBeenCalledTimes(1);
		expect(queryClient.getQueryData(fullKey)).toEqual({
			taskLabels: { items: [{ id: 'new' }, { id: 'old' }], total: 17 },
			taskStatuses: full.taskStatuses
		});
		expect(queryClient.getQueryData(matchingPartialKey)).toEqual({
			taskLabels: { items: [{ id: 'new' }, { id: 'old' }], total: 17 },
			taskStatuses: full.taskStatuses
		});
		expect(queryClient.getQueryData(unrelatedPartialKey)).toEqual({ taskStatuses: full.taskStatuses });
		expect(queryClient.getQueryData(otherScopeKey)).toEqual(full);
		expect(queryClient.getQueryData(queryKeys.taskLabels.byScope(scope))).toEqual({
			items: [{ id: 'new' }, { id: 'old' }],
			total: 4
		});
		expect(queryClient.getQueryData(queryKeys.taskLabels.byTeam('team-1'))).toEqual({
			items: [{ id: 'new' }, { id: 'old' }],
			total: 6
		});
	});

	it('evaluates a fast-mode functional updater once against the full bundle section', () => {
		const queryClient = new QueryClient();
		const fullKey = queryKeys.taskMetadata.bootstrap(scope);
		queryClient.setQueryData(fullKey, { taskLabels: { items: [{ id: 'bundle' }], total: 3 } });
		queryClient.setQueryData(queryKeys.taskLabels.byTeam('team-1'), {
			items: [{ id: 'legacy' }],
			total: 4
		});
		const updater = jest.fn((previous: Array<{ id: string }>) => [{ id: 'new' }, ...previous]);

		updateTaskMetadataSectionCaches(
			queryClient,
			{ section: 'taskLabels', scope, teamId: 'team-1', useBootstrap: true },
			updater
		);

		expect(updater).toHaveBeenCalledTimes(1);
		expect(updater).toHaveBeenCalledWith([{ id: 'bundle' }]);
		expect(queryClient.getQueryData(fullKey)).toEqual({
			taskLabels: { items: [{ id: 'new' }, { id: 'bundle' }], total: 3 }
		});
		expect(queryClient.getQueryData(queryKeys.taskLabels.byTeam('team-1'))).toEqual({
			items: [{ id: 'new' }, { id: 'bundle' }],
			total: 4
		});
	});

	it.each([
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
	] as const)(
		'invalidates matching bundle, scoped, and legacy %s keys only',
		async (section, scopedKey, legacyKey) => {
			const queryClient = new QueryClient();
			const fullKey = queryKeys.taskMetadata.bootstrap(scope);
			const matchingPartialKey = queryKeys.taskMetadata.bootstrap(scope, [section]);
			const nonmatchingSection = section === 'taskStatuses' ? 'taskLabels' : 'taskStatuses';
			const unrelatedPartialKey = queryKeys.taskMetadata.bootstrap(scope, [nonmatchingSection]);
			const otherScopeKey = queryKeys.taskMetadata.bootstrap(otherScope);
			queryClient.setQueryData(fullKey, { [section]: { items: [], total: 0 } });
			queryClient.setQueryData(matchingPartialKey, { [section]: { items: [], total: 0 } });
			queryClient.setQueryData(unrelatedPartialKey, { [nonmatchingSection]: { items: [], total: 0 } });
			queryClient.setQueryData(otherScopeKey, { [section]: { items: [], total: 0 } });
			queryClient.setQueryData(scopedKey, { items: [], total: 0 });
			queryClient.setQueryData(legacyKey, { items: [], total: 0 });

			await invalidateTaskMetadataSectionCaches(queryClient, {
				section: section as TaskMetadataSection,
				scope,
				teamId: 'team-1'
			});

			expect(queryClient.getQueryState(fullKey)?.isInvalidated).toBe(true);
			expect(queryClient.getQueryState(matchingPartialKey)?.isInvalidated).toBe(true);
			expect(queryClient.getQueryState(scopedKey)?.isInvalidated).toBe(true);
			expect(queryClient.getQueryState(legacyKey)?.isInvalidated).toBe(true);
			expect(queryClient.getQueryState(unrelatedPartialKey)?.isInvalidated).toBe(false);
			expect(queryClient.getQueryState(otherScopeKey)?.isInvalidated).toBe(false);
		}
	);

	it('derives the legacy invalidation key from the captured scope when no separate team id is passed', async () => {
		const queryClient = new QueryClient();
		const legacyKey = queryKeys.taskLabels.byTeam(scope.organizationTeamId);
		queryClient.setQueryData(legacyKey, { items: [], total: 0 });

		await invalidateTaskMetadataSectionCaches(queryClient, { section: 'taskLabels', scope });

		expect(queryClient.getQueryState(legacyKey)?.isInvalidated).toBe(true);
	});
});
