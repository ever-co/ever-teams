import { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	TaskMetadataBootstrapResponse,
	TaskMetadataScope,
	TaskMetadataSection
} from '@/core/types/interfaces/task/task-metadata-bootstrap';

type CacheTarget = {
	section: TaskMetadataSection;
	scope?: TaskMetadataScope;
	teamId?: string | null;
	useBootstrap?: boolean;
};

type SectionCache<T> = {
	items?: T[];
	[key: string]: unknown;
};

export function createTaskMetadataScope(
	tenantId?: string | null,
	organizationId?: string | null,
	organizationTeamId?: string | null,
	projectId?: string | null
): TaskMetadataScope | undefined {
	if (!tenantId || !organizationId || !organizationTeamId) {
		return undefined;
	}

	return {
		tenantId,
		organizationId,
		organizationTeamId,
		...(projectId ? { projectId } : {})
	};
}

function sectionKey(section: TaskMetadataSection, scope: TaskMetadataScope): QueryKey {
	switch (section) {
		case 'taskStatuses':
			return queryKeys.taskStatuses.byScope(scope);
		case 'taskPriorities':
			return queryKeys.taskPriorities.byScope(scope);
		case 'taskSizes':
			return queryKeys.taskSizes.byScope(scope);
		case 'taskLabels':
			return queryKeys.taskLabels.byScope(scope);
		case 'taskVersions':
			return queryKeys.taskVersions.byScope(scope);
		case 'issueTypes':
			return queryKeys.issueTypes.byScope(scope);
		case 'relatedIssueTypes':
			return queryKeys.taskRelatedIssueTypes.byScope(scope);
	}
}

function legacySectionKey(section: TaskMetadataSection, teamId: string | null | undefined): QueryKey {
	switch (section) {
		case 'taskStatuses':
			return queryKeys.taskStatuses.byTeam(teamId);
		case 'taskPriorities':
			return queryKeys.taskPriorities.byTeam(teamId);
		case 'taskSizes':
			return queryKeys.taskSizes.byTeam(teamId);
		case 'taskLabels':
			return queryKeys.taskLabels.byTeam(teamId);
		case 'taskVersions':
			return queryKeys.taskVersions.byTeam(teamId);
		case 'issueTypes':
			return queryKeys.issueTypes.byTeam(teamId);
		case 'relatedIssueTypes':
			return queryKeys.taskRelatedIssueTypes.byTeam(teamId);
	}
}

function matchesBundleSection(queryKey: QueryKey, scope: TaskMetadataScope, section: TaskMetadataSection) {
	const key = queryKey as readonly unknown[];
	if (
		key[0] !== 'task-metadata' ||
		key[1] !== 'bootstrap' ||
		key[2] !== scope.tenantId ||
		key[3] !== scope.organizationId ||
		key[4] !== (scope.organizationTeamId ?? null) ||
		key[5] !== (scope.projectId ?? null) ||
		typeof key[6] !== 'string'
	) {
		return false;
	}

	return key[6].split(',').includes(section);
}

function updateSection<T>(oldData: SectionCache<T> | undefined, items: T[]) {
	return { ...(oldData ?? {}), items };
}

export function updateTaskMetadataSectionCaches<T>(
	queryClient: QueryClient,
	target: CacheTarget,
	updaterOrValue: T[] | ((previous: T[]) => T[])
) {
	const { section, scope, teamId, useBootstrap = false } = target;
	const legacyTeamId = teamId ?? scope?.organizationTeamId;
	const source =
		useBootstrap && scope
			? (queryClient.getQueryData<TaskMetadataBootstrapResponse>(queryKeys.taskMetadata.bootstrap(scope))?.[
					section
				] as SectionCache<T> | undefined)
			: queryClient.getQueryData<SectionCache<T>>(legacySectionKey(section, legacyTeamId));
	const previous = source?.items ?? [];
	const items = typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;

	if (scope) {
		queryClient.setQueriesData<TaskMetadataBootstrapResponse>(
			{ predicate: (query) => matchesBundleSection(query.queryKey, scope, section) },
			(oldData) => {
				if (!oldData) {
					return oldData;
				}
				const oldSection = oldData[section] as SectionCache<T> | undefined;
				return { ...oldData, [section]: updateSection(oldSection, items) };
			}
		);
		queryClient.setQueryData<SectionCache<T>>(sectionKey(section, scope), (oldData) =>
			updateSection(oldData, items)
		);
	}

	queryClient.setQueryData<SectionCache<T>>(legacySectionKey(section, legacyTeamId), (oldData) =>
		updateSection(oldData, items)
	);
}

export async function invalidateTaskMetadataSectionCaches(queryClient: QueryClient, target: CacheTarget) {
	const { section, scope, teamId } = target;
	const legacyTeamId = teamId ?? scope?.organizationTeamId;
	const invalidations: Promise<unknown>[] = [];

	if (scope) {
		invalidations.push(
			queryClient.invalidateQueries({
				predicate: (query) => matchesBundleSection(query.queryKey, scope, section)
			}),
			queryClient.invalidateQueries({ queryKey: sectionKey(section, scope), exact: true })
		);
	}

	if (legacyTeamId) {
		invalidations.push(
			queryClient.invalidateQueries({ queryKey: legacySectionKey(section, legacyTeamId), exact: true })
		);
	}

	await Promise.all(invalidations);
}
