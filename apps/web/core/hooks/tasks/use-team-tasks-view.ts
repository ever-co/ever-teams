'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
	type TeamTasksLayout,
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
import type { ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const NOTHING_COLLAPSED: ReadonlySet<string> = new Set();

const VIEW_STORAGE_KEY = 'team-tasks-view';
const SCOPE_STORAGE_KEY = 'team-tasks-scope';
const COLLAPSED_STORAGE_KEY = 'team-tasks-collapsed-groups';

const NO_FILTERS: TeamTasksFilters = {};

/** How the page is opened: on the team's tasks with the device's view, or on a saved / built-in view. */
interface TeamTasksViewOptions {
	/** A saved or built-in view: the page starts from this definition and keeps its changes in memory, not on the device. */
	initial?: ITaskViewDefinition;
	/** What names the view opened (its id, a built-in key): the page starts again from `initial` when it changes, and only then. */
	resetKey?: string;
	/** The tasks to list instead of the team's (a built-in view's, computed by the platform). */
	tasks?: TTask[];
}

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
 * and ordered by the view, flattened into the rows the virtual list renders, plus the selection. On the team's
 * tasks the view, the scope and the folded groups are remembered on this device; on a saved or built-in view
 * (`options.initial`) the page starts from the view and keeps its changes in memory until they are saved.
 */
export function useTeamTasksView(options: TeamTasksViewOptions = {}) {
	const teamTasks = useAtomValue(tasksByTeamState);
	const tasks = options.tasks ?? teamTasks;
	const activeTeam = useAtomValue(activeTeamState);
	const {
		taskStatuses,
		getTaskStatusesLoading,
		isError: isStatusesError,
		refetch: refetchStatuses
	} = useTaskStatusesQuery();
	const priorityValueMap = useTaskPrioritiesValue();
	const { organizationProjects } = useOrganizationProjectsQuery();

	const initial = options.initial;
	const isDetached = initial !== undefined;
	// Without a reset key the definition itself is the key (a refetched view then re-seeds; with one, it does not).
	const initialKey = options.resetKey ?? JSON.stringify(initial ?? null);
	// The latest `initial`, written after commit (never during a render React may discard), before the reset
	// effect below reads it: effects run in declaration order.
	const initialRef = useRef(initial);
	useEffect(() => {
		initialRef.current = initial;
	});

	const [storedView, setStoredView] = useLocalStorageState<unknown>(VIEW_STORAGE_KEY, DEFAULT_TEAM_TASKS_VIEW);
	const [storedScope, setStoredScope] = useLocalStorageState<unknown>(SCOPE_STORAGE_KEY, 'active');
	const [storedCollapsed, setStoredCollapsed] = useLocalStorageState<unknown>(COLLAPSED_STORAGE_KEY, []);
	// A saved or built-in view: its state lives here, seeded from the view, never on this device.
	const [memoryView, setMemoryView] = useState<TeamTasksViewSettings>(() => initial?.settings ?? DEFAULT_TEAM_TASKS_VIEW);
	const [memoryScope, setMemoryScope] = useState<TeamTasksScope>(() => initial?.scope ?? 'active');
	const [search, setSearch] = useState(() => initial?.search ?? '');
	const [filters, setFilters] = useState<TeamTasksFilters>(() => initial?.filters ?? NO_FILTERS);
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
	const [anchorId, setAnchorId] = useState<string | null>(null);

	// Another view opened in the same page: start again from it.
	useEffect(() => {
		const next = initialRef.current;
		if (!next || !initialKey) {
			return;
		}
		setMemoryView(next.settings);
		setMemoryScope(next.scope);
		setFilters(next.filters);
		setSearch(next.search ?? '');
		setSelectedIds(new Set());
		setAnchorId(null);
	}, [initialKey]);

	const settings = useMemo(
		() => (isDetached ? memoryView : viewSettingsFromStorage(storedView)),
		[isDetached, memoryView, storedView]
	);
	const scope = isDetached ? memoryScope : scopeFromStorage(storedScope);
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
	// A board shows every task of the view: a group collapsed in the list hides nothing there, nor from the selection.
	const isBoard = settings.layout === 'board' && isTaskViewsEnabled();
	const rows = useMemo(
		() => flattenTeamTasksGroups(groups, isBoard ? NOTHING_COLLAPSED : collapsedKeys, showsGroupHeaders),
		[groups, collapsedKeys, isBoard, showsGroupHeaders]
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
			if (isDetached) {
				setMemoryView((current) => change(current));
				return;
			}
			setStoredView((current: unknown) => change(viewSettingsFromStorage(current)));
		},
		[isDetached, setStoredView]
	);

	const setScope = useCallback(
		(next: TeamTasksScope) => {
			if (isDetached) {
				setMemoryScope(next);
				return;
			}
			setStoredScope(next);
		},
		[isDetached, setStoredScope]
	);

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
	/** A list is what a view without a layout is: only a board is written down. */
	const setLayout = useCallback(
		(layout: TeamTasksLayout) =>
			updateView((current) => {
				const next = { ...current };
				delete next.layout;
				return layout === 'board' ? { ...next, layout } : next;
			}),
		[updateView]
	);
	const resetView = useCallback(() => {
		if (isDetached) {
			setMemoryView(initial?.settings ?? DEFAULT_TEAM_TASKS_VIEW);
			return;
		}
		setStoredView(DEFAULT_TEAM_TASKS_VIEW);
	}, [initial?.settings, isDetached, setStoredView]);

	const setFilter = useCallback((field: TeamTasksFilterField, values: string[]) => {
		setFilters((current) => ({ ...current, [field]: values }));
	}, []);
	const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);
	const clearNarrowing = useCallback(() => {
		setFilters(NO_FILTERS);
		setSearch('');
	}, []);

	/** What the page shows now, as a view would save it. */
	const definition = useMemo<ITaskViewDefinition>(
		() => ({ settings, filters, scope, search }),
		[filters, scope, search, settings]
	);
	/** Puts a view's definition in place (a reload after someone else saved it, for one). */
	const applyDefinition = useCallback(
		(next: ITaskViewDefinition) => {
			if (isDetached) {
				setMemoryView(next.settings);
				setMemoryScope(next.scope);
			} else {
				setStoredView(next.settings);
				setStoredScope(next.scope);
			}
			setFilters(next.filters);
			setSearch(next.search ?? '');
		},
		[isDetached, setStoredScope, setStoredView]
	);

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
		isDetached,
		definition,
		applyDefinition,
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
		setLayout,
		resetView,
		toggleGroup,
		toggleSelected,
		setManySelected,
		clearSelection
	};
}

export type TeamTasksViewState = ReturnType<typeof useTeamTasksView>;
