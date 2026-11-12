'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTeamTasksQuery } from '../organizations';
import { EIssueType } from '@/core/types/generics/enums/task';
import {
	EMPTY_KANBAN_PROPERTY_FILTERS,
	KanbanDay,
	KanbanFilterField,
	KanbanFilters,
	KanbanPropertyFilters,
	countPropertyFilters,
	matchesKanbanFilters
} from '@/core/lib/utils/kanban-board';
import { useKanbanLanes } from './use-kanban-lanes';

const EMPLOYEE_PARAM = 'employee';

function urlWithQuery(pathname: string, params: URLSearchParams) {
	const query = params.toString();
	if (!query) {
		return pathname;
	}
	return `${pathname}?${query}`;
}

/**
 * The Kanban page's single source: team tasks grouped into one lane per status, the toolbar filters, and every
 * board mutation (the lanes' own, from `useKanbanLanes`).
 */
export function useKanbanBoard() {
	const { tasks } = useTeamTasksQuery();

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const employee = searchParams.get(EMPLOYEE_PARAM);

	const [search, setSearch] = useState('');
	const [day, setDay] = useState<KanbanDay>('all');
	const [properties, setProperties] = useState<KanbanPropertyFilters>(EMPTY_KANBAN_PROPERTY_FILTERS);

	const epics = useMemo(() => tasks.filter((task) => task.issueType === EIssueType.EPIC), [tasks]);

	const filters = useMemo<KanbanFilters>(
		() => ({ search, properties, employee, day }),
		[search, properties, employee, day]
	);

	const visibleTasks = useMemo(() => {
		const now = new Date();
		return tasks.filter((task) => matchesKanbanFilters(task, filters, now));
	}, [tasks, filters]);

	const { lanes, statuses, isLoading, isError, refetchTaskStatuses, moveTask, moveLane, setLaneCollapsed } =
		useKanbanLanes(visibleTasks);

	const propertyFilterCount = countPropertyFilters(properties);
	const hasSearch = search.trim().length > 0;
	const hasDay = day !== 'all';
	const hasEmployee = Boolean(employee);
	const isNarrowed = [propertyFilterCount > 0, hasSearch, hasDay, hasEmployee].some(Boolean);
	const hiddenTaskCount = tasks.length - visibleTasks.length;

	const setPropertyFilter = useCallback((field: KanbanFilterField, values: string[]) => {
		setProperties((current) => ({ ...current, [field]: values }));
	}, []);

	const clearEmployee = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete(EMPLOYEE_PARAM);
		router.replace(urlWithQuery(pathname, params));
	}, [pathname, router, searchParams]);

	const filterByEmployee = useCallback(
		(fullName: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(EMPLOYEE_PARAM, fullName);
			router.replace(urlWithQuery(pathname, params));
		},
		[pathname, router, searchParams]
	);

	const clearFilters = useCallback(() => {
		setSearch('');
		setDay('all');
		setProperties(EMPTY_KANBAN_PROPERTY_FILTERS);
		if (employee) {
			clearEmployee();
		}
	}, [clearEmployee, employee]);

	const clearPropertyFilters = useCallback(() => {
		setProperties(EMPTY_KANBAN_PROPERTY_FILTERS);
	}, []);

	return {
		lanes,
		statuses,
		epics,
		isLoading,
		isError,
		refetchTaskStatuses,
		filters,
		search,
		setSearch,
		day,
		setDay,
		properties,
		setPropertyFilter,
		clearPropertyFilters,
		propertyFilterCount,
		employee,
		filterByEmployee,
		clearEmployee,
		clearFilters,
		isNarrowed,
		hiddenTaskCount,
		moveTask,
		moveLane,
		setLaneCollapsed
	};
}

export type KanbanBoardState = ReturnType<typeof useKanbanBoard>;
