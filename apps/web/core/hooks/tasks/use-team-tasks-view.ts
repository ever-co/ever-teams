'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useTaskStatusesQuery } from './use-task-statuses-query';
import { useTaskPrioritiesValue } from './use-task-priorities-value';
import { sortStatusesByOrder } from '@/core/lib/utils/kanban-board';
import {
	DEFAULT_TEAM_TASKS_VIEW,
	buildTeamTasksGroups,
	childCountsOf,
	countFilters,
	flattenTeamTasksGroups,
	idsBetween,
	isInScope,
	matchesTeamTasksFilters,
	orderedTaskIdsOf,
	withoutListedSubTasks,
	type TeamTaskProperty,
	type TeamTasksFilterField,
	type TeamTasksFilters,
	type TeamTasksGrouping,
	type TeamTasksLookups,
	type TeamTasksOrdering,
	type TeamTasksScope,
	type TeamTasksViewSettings
} from '@/core/lib/utils/team-tasks-view';
import {
	collapsedKeysFromStorage,
	isDefaultView,
	scopeFromStorage,
	viewSettingsFromStorage,
	withToggledProperty
} from '@/core/lib/utils/team-tasks-view-storage';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const VIEW_STORAGE_KEY = 'team-tasks-view';
const SCOPE_STORAGE_KEY = 'team-tasks-scope';
const COLLAPSED_STORAGE_KEY = 'team-tasks-collapsed-groups';

const NO_FILTERS: TeamTasksFilters = {};

function memberEntriesOf(members: TOrganizationTeamEmployee[] | null | undefined) {
	const entries: [string, string][] = [];
	for (const member of members ?? []) {
		const employeeId = member.employeeId ?? member.employee?.id;
		if (!employeeId) {
			continue;
		}
		const name = member.employee?.fullName ?? member.employee?.user?.name ?? '';
		entries.push([employeeId, name]);
	}
	return entries;
}

function priorityValuesOf(values: Record<string, { value?: string }>) {
	return Object.entries(values).map(([key, item]) => item.value || key);
}

function taskIndexOf(tasks: TTask[]) {
	const byId = new Map<string, TTask>();
	for (const task of tasks) {
		byId.set(task.id, task);
	}
	return byId;
}

function withToggledId(ids: ReadonlySet<string>, id: string) {
	const next = new Set(ids);
	if (next.has(id)) {
		next.delete(id);
		return next;
	}
	next.add(id);
	return next;
}

function withIds(ids: ReadonlySet<string>, changed: string[], isSelected: boolean) {
	const next = new Set(ids);
	for (const id of changed) {
		if (isSelected) {
			next.add(id);
			continue;
		}
		next.delete(id);
	}
	return next;
}

/**
 * The Team tasks page's single source: the team's tasks narrowed by the scope, the search and the filters, grouped
 * and ordered by the saved view, flattened into the rows the virtual list renders, plus the selection. The view,
 * the scope and the folded groups are remembered on this device.
 */
export function useTeamTasksView() {
	const tasks = useAtomValue(tasksByTeamState);
	const activeTeam = useAtomValue(activeTeamState);
	const {
		taskStatuses,
		getTaskStatusesLoading,
		isError: isStatusesError,
		refetch: refetchStatuses
	} = useTaskStatusesQuery();
	const priorityValueMap = useTaskPrioritiesValue();
	const { organizationProjects } = useOrganizationProjectsQuery();

	const [storedView, setStoredView] = useLocalStorageState<unknown>(VIEW_STORAGE_KEY, DEFAULT_TEAM_TASKS_VIEW);
	const [storedScope, setStoredScope] = useLocalStorageState<unknown>(SCOPE_STORAGE_KEY, 'active');
	const [storedCollapsed, setStoredCollapsed] = useLocalStorageState<unknown>(COLLAPSED_STORAGE_KEY, []);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState<TeamTasksFilters>(NO_FILTERS);
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
	const [anchorId, setAnchorId] = useState<string | null>(null);

	const settings = useMemo(() => viewSettingsFromStorage(storedView), [storedView]);
	const scope = scopeFromStorage(storedScope);
	const collapsedKeys = useMemo(() => new Set(collapsedKeysFromStorage(storedCollapsed)), [storedCollapsed]);

	const statuses = useMemo(() => sortStatusesByOrder(taskStatuses), [taskStatuses]);
	const priorityValues = useMemo(() => priorityValuesOf(priorityValueMap), [priorityValueMap]);

	// The team object is rebuilt on every presence refresh: the names are keyed by their text so groups stay put.
	const memberEntries = memberEntriesOf(activeTeam?.members);
	const memberSignature = JSON.stringify(memberEntries);
	const memberNames = useMemo(
		() => new Map<string, string>(JSON.parse(memberSignature) as [string, string][]),
		[memberSignature]
	);
	const projectNames = useMemo(() => {
		const names = new Map<string, string>();
		for (const project of organizationProjects) {
			names.set(project.id, project.name ?? '');
		}
		return names;
	}, [organizationProjects]);
	const lookups = useMemo<TeamTasksLookups>(
		() => ({ statuses, projectNames, memberNames }),
		[statuses, projectNames, memberNames]
	);

	const taskById = useMemo(() => taskIndexOf(tasks), [tasks]);
	const childCounts = useMemo(() => childCountsOf(tasks), [tasks]);

	const matchingTasks = useMemo(
		() => tasks.filter((task) => matchesTeamTasksFilters(task, search, filters, statuses)),
		[tasks, search, filters, statuses]
	);

	const scopeCounts = useMemo(() => {
		let done = 0;
		for (const task of matchingTasks) {
			if (isInScope(task, 'done', statuses)) {
				done += 1;
			}
		}
		const all = matchingTasks.length;
		return { all, done, active: all - done };
	}, [matchingTasks, statuses]);

	const scopedTasks = useMemo(
		() => matchingTasks.filter((task) => isInScope(task, scope, statuses)),
		[matchingTasks, scope, statuses]
	);
	const scopeTotal = useMemo(
		() => tasks.filter((task) => isInScope(task, scope, statuses)).length,
		[tasks, scope, statuses]
	);

	const listedTasks = useMemo(() => {
		if (settings.showsSubTasks) {
			return scopedTasks;
		}
		return withoutListedSubTasks(scopedTasks);
	}, [scopedTasks, settings.showsSubTasks]);

	const groups = useMemo(
		() => buildTeamTasksGroups(listedTasks, settings, lookups, priorityValues),
		[listedTasks, settings, lookups, priorityValues]
	);
	const showsGroupHeaders = settings.grouping !== 'none';
	const rows = useMemo(
		() => flattenTeamTasksGroups(groups, collapsedKeys, showsGroupHeaders),
		[groups, collapsedKeys, showsGroupHeaders]
	);
	const orderedIds = useMemo(() => orderedTaskIdsOf(rows), [rows]);

	const filterCount = countFilters(filters);
	const hasSearch = search.trim().length > 0;
	const isNarrowed = filterCount > 0 || hasSearch;
	const hiddenCount = scopeTotal - scopedTasks.length;

	const visibleSelection = useMemo(() => {
		const visible = new Set<string>();
		for (const id of orderedIds) {
			if (selectedIds.has(id)) {
				visible.add(id);
			}
		}
		return visible;
	}, [orderedIds, selectedIds]);

	const updateView = useCallback(
		(change: (current: TeamTasksViewSettings) => TeamTasksViewSettings) => {
			setStoredView((current: unknown) => change(viewSettingsFromStorage(current)));
		},
		[setStoredView]
	);

	const setScope = useCallback((next: TeamTasksScope) => setStoredScope(next), [setStoredScope]);

	const setGrouping = useCallback(
		(grouping: TeamTasksGrouping) => updateView((current) => ({ ...current, grouping })),
		[updateView]
	);
	const setOrdering = useCallback(
		(ordering: TeamTasksOrdering) => updateView((current) => ({ ...current, ordering })),
		[updateView]
	);
	const toggleDirection = useCallback(
		() => updateView((current) => ({ ...current, isDescending: !current.isDescending })),
		[updateView]
	);
	const toggleProperty = useCallback(
		(property: TeamTaskProperty) => updateView((current) => withToggledProperty(current, property)),
		[updateView]
	);
	const setShowsSubTasks = useCallback(
		(showsSubTasks: boolean) => updateView((current) => ({ ...current, showsSubTasks })),
		[updateView]
	);
	const setShowsEmptyGroups = useCallback(
		(showsEmptyGroups: boolean) => updateView((current) => ({ ...current, showsEmptyGroups })),
		[updateView]
	);
	const resetView = useCallback(() => setStoredView(DEFAULT_TEAM_TASKS_VIEW), [setStoredView]);

	const setFilter = useCallback((field: TeamTasksFilterField, values: string[]) => {
		setFilters((current) => ({ ...current, [field]: values }));
	}, []);
	const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);
	const clearNarrowing = useCallback(() => {
		setFilters(NO_FILTERS);
		setSearch('');
	}, []);

	const toggleGroup = useCallback(
		(key: string) => {
			setStoredCollapsed((current: unknown) => {
				const keys = new Set(collapsedKeysFromStorage(current));
				if (keys.has(key)) {
					keys.delete(key);
				} else {
					keys.add(key);
				}
				return [...keys];
			});
		},
		[setStoredCollapsed]
	);

	const toggleSelected = useCallback(
		(id: string, extendsRange: boolean) => {
			const hasAnchor = Boolean(anchorId);
			const selectsRange = extendsRange && hasAnchor;
			if (selectsRange) {
				const range = idsBetween(orderedIds, anchorId as string, id);
				setSelectedIds((current) => withIds(current, range, true));
				return;
			}
			setSelectedIds((current) => withToggledId(current, id));
			setAnchorId(id);
		},
		[anchorId, orderedIds]
	);
	const setManySelected = useCallback((ids: string[], isSelected: boolean) => {
		setSelectedIds((current) => withIds(current, ids, isSelected));
	}, []);
	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
		setAnchorId(null);
	}, []);

	return {
		tasks,
		taskById,
		childCounts,
		statuses,
		lookups,
		priorityValues,
		isStatusesLoading: getTaskStatusesLoading,
		isStatusesError,
		refetchStatuses,
		settings,
		isDefaultView: isDefaultView(settings),
		scope,
		scopeCounts,
		search,
		filters,
		filterCount,
		isNarrowed,
		hiddenCount,
		groups,
		rows,
		orderedIds,
		collapsedKeys,
		selectedIds: visibleSelection,
		setScope,
		setSearch,
		setFilter,
		clearFilters,
		clearNarrowing,
		setGrouping,
		setOrdering,
		toggleDirection,
		toggleProperty,
		setShowsSubTasks,
		setShowsEmptyGroups,
		resetView,
		toggleGroup,
		toggleSelected,
		setManySelected,
		clearSelection
	};
}

export type TeamTasksViewState = ReturnType<typeof useTeamTasksView>;
