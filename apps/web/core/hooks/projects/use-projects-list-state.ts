'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import {
	LAST_SELECTED_PROJECTS_VIEW,
	PROJECTS_LIST_GROUPING,
	PROJECTS_LIST_HIDDEN_COLUMNS,
	PROJECTS_TABLE_VIEW_LAST_SORTING
} from '@/core/constants/config/constants';
import {
	ARCHIVED_PARAM,
	DATE_FROM_PARAM,
	DATE_TO_PARAM,
	PROJECT_FILTER_FIELDS,
	countActiveFilterValues,
	readProjectDateRange,
	readProjectFilters,
	urlWithParams,
	type ProjectColumn,
	type ProjectFilterField,
	type ProjectFilters,
	type ProjectGrouping,
	type ProjectOrderField,
	type ProjectOrdering,
	type ProjectScope,
	type ProjectsView
} from '@/core/lib/utils/project-list';

const ORDER_FIELDS: ProjectOrderField[] = ['name', 'status', 'startDate', 'endDate', 'createdAt'];

const DEFAULT_ORDERING: ProjectOrdering = { id: 'name', desc: false };

const DEFAULT_SORTING_STATE: ProjectOrdering[] = [DEFAULT_ORDERING];

/** The previous table named the name column `project`; any other unknown column falls back to the name. */
function orderingFromStorage(stored: ProjectOrdering[] | null | undefined): ProjectOrdering {
	const isStoredList = Array.isArray(stored);
	if (!isStoredList) {
		return DEFAULT_ORDERING;
	}
	const first = stored[0];
	if (!first) {
		return DEFAULT_ORDERING;
	}
	const isKnownField = ORDER_FIELDS.includes(first.id);
	if (!isKnownField) {
		return { id: 'name', desc: Boolean(first.desc) };
	}
	return { id: first.id, desc: Boolean(first.desc) };
}

/** A selection belongs to the list it was made in: another scope, filter or date range starts empty. */
interface KeyedSelection {
	urlKey: string;
	ids: string[];
}

function selectionFor(selection: KeyedSelection, urlKey: string) {
	const isSameList = selection.urlKey === urlKey;
	if (!isSameList) {
		return [];
	}
	return selection.ids;
}

function scopeOf(params: URLSearchParams): ProjectScope {
	const isArchived = Boolean(params.get(ARCHIVED_PARAM));
	if (isArchived) {
		return 'archived';
	}
	return 'active';
}

function isoDayOf(date: Date) {
	return date.toISOString().split('T')[0];
}

function toggled(values: string[], value: string) {
	if (values.includes(value)) {
		return values.filter((current) => current !== value);
	}
	return [...values, value];
}

/** Scope, filters and dates stay in the URL: the sidebar's Archive entry and shared links rely on them. */
export function useProjectsListState() {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const scope = scopeOf(params);
	const filters = useMemo(() => readProjectFilters(params), [params]);
	const dateRange = useMemo(() => readProjectDateRange(params), [params]);
	const activeFilterCount = countActiveFilterValues(filters);
	const hasDateRange = Boolean(dateRange);

	const [search, setSearch] = useState('');
	const [view, setView] = useLocalStorageState<ProjectsView>(LAST_SELECTED_PROJECTS_VIEW, 'LIST');
	const [grouping, setGrouping] = useLocalStorageState<ProjectGrouping>(PROJECTS_LIST_GROUPING, 'status');
	const [storedSorting, setStoredSorting] = useLocalStorageState<ProjectOrdering[]>(
		PROJECTS_TABLE_VIEW_LAST_SORTING,
		DEFAULT_SORTING_STATE
	);
	const [hiddenColumns, setHiddenColumns] = useLocalStorageState<ProjectColumn[]>(PROJECTS_LIST_HIDDEN_COLUMNS, []);
	const urlKey = params.toString();
	const [selection, setSelectionState] = useState<KeyedSelection>({ urlKey, ids: [] });
	const selectedIds = selectionFor(selection, urlKey);

	const ordering = orderingFromStorage(storedSorting);

	const replaceParams = useCallback(
		(change: (next: URLSearchParams) => void) => {
			const next = new URLSearchParams(params.toString());
			change(next);
			router.replace(urlWithParams(pathname, next), { scroll: false });
		},
		[params, pathname, router]
	);

	const setScope = useCallback(
		(nextScope: ProjectScope) => {
			replaceParams((next) => {
				if (nextScope === 'archived') {
					next.set(ARCHIVED_PARAM, 'true');
					return;
				}
				next.delete(ARCHIVED_PARAM);
			});
		},
		[replaceParams]
	);

	const setFilter = useCallback(
		(field: ProjectFilterField, values: string[]) => {
			replaceParams((next) => {
				if (values.length > 0) {
					next.set(field, values.join(','));
					return;
				}
				next.delete(field);
			});
		},
		[replaceParams]
	);

	const removeFilterValue = useCallback(
		(field: ProjectFilterField, value: string) => {
			const remaining = filters[field].filter((current) => current !== value);
			setFilter(field, remaining);
		},
		[filters, setFilter]
	);

	const setDateRange = useCallback(
		(range: DateRange | undefined) => {
			replaceParams((next) => {
				const from = range?.from;
				const to = range?.to;
				if (from && to) {
					next.set(DATE_FROM_PARAM, isoDayOf(from));
					next.set(DATE_TO_PARAM, isoDayOf(to));
					return;
				}
				next.delete(DATE_FROM_PARAM);
				next.delete(DATE_TO_PARAM);
			});
		},
		[replaceParams]
	);

	const clearFilters = useCallback(() => {
		replaceParams((next) => {
			for (const field of PROJECT_FILTER_FIELDS) {
				next.delete(field);
			}
			next.delete(DATE_FROM_PARAM);
			next.delete(DATE_TO_PARAM);
		});
	}, [replaceParams]);

	const setOrdering = useCallback(
		(nextOrdering: ProjectOrdering) => {
			setStoredSorting([nextOrdering]);
		},
		[setStoredSorting]
	);

	const toggleColumn = useCallback(
		(column: ProjectColumn) => {
			setHiddenColumns((current) => toggled(current, column) as ProjectColumn[]);
		},
		[setHiddenColumns]
	);

	const isColumnVisible = useCallback((column: ProjectColumn) => !hiddenColumns.includes(column), [hiddenColumns]);

	const toggleSelected = useCallback(
		(projectId: string) => {
			setSelectionState((current) => {
				const currentIds = selectionFor(current, urlKey);
				const ids = toggled(currentIds, projectId);
				return { urlKey, ids };
			});
		},
		[setSelectionState, urlKey]
	);

	const setSelection = useCallback(
		(projectIds: string[]) => {
			setSelectionState({ urlKey, ids: projectIds });
		},
		[setSelectionState, urlKey]
	);

	const clearSelection = useCallback(() => {
		setSelectionState({ urlKey, ids: [] });
	}, [setSelectionState, urlKey]);

	return {
		scope,
		setScope,
		filters,
		setFilter,
		removeFilterValue,
		activeFilterCount,
		dateRange,
		hasDateRange,
		setDateRange,
		clearFilters,
		search,
		setSearch,
		view,
		setView,
		grouping,
		setGrouping,
		ordering,
		setOrdering,
		hiddenColumns,
		toggleColumn,
		isColumnVisible,
		selectedIds,
		toggleSelected,
		setSelection,
		clearSelection
	};
}

export type ProjectsListState = ReturnType<typeof useProjectsListState>;

export type { ProjectFilters };
