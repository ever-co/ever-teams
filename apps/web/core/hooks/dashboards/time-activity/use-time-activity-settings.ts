'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import {
	EMPTY_TIME_ACTIVITY_FILTERS,
	TIME_ACTIVITY_COLUMNS_STORAGE_KEY,
	TIME_ACTIVITY_FILTERS_STORAGE_KEY,
	type TimeActivityColumn,
	type TimeActivityFilterField,
	type TimeActivityFilters,
	type TimeActivityGrouping,
	activeFilterCountOf,
	filtersFromStorage,
	hiddenColumnsFromStorage
} from '@/core/lib/utils/dashboards/time-activity';

function withToggledColumn(hidden: TimeActivityColumn[], column: TimeActivityColumn) {
	const isHidden = hidden.includes(column);
	if (isHidden) {
		return hidden.filter((current) => current !== column);
	}
	return [...hidden, column];
}

export function useTimeActivitySettings() {
	const [storedFilters, setStoredFilters] = useLocalStorageState<unknown>(TIME_ACTIVITY_FILTERS_STORAGE_KEY, null);
	const [storedColumns, setStoredColumns] = useLocalStorageState<unknown>(TIME_ACTIVITY_COLUMNS_STORAGE_KEY, null);
	const [grouping, setGrouping] = useState<TimeActivityGrouping>('date');

	const filters = useMemo(() => filtersFromStorage(storedFilters), [storedFilters]);
	const hiddenColumns = useMemo(() => hiddenColumnsFromStorage(storedColumns), [storedColumns]);
	const activeFilterCount = activeFilterCountOf(filters);

	const setFilterValues = useCallback(
		(field: TimeActivityFilterField, values: string[]) => {
			const nextFilters: TimeActivityFilters = { ...filters, [field]: values };
			setStoredFilters(nextFilters);
		},
		[filters, setStoredFilters]
	);

	const removeFilterValue = useCallback(
		(field: TimeActivityFilterField, value: string) => {
			const remaining = filters[field].filter((current) => current !== value);
			setFilterValues(field, remaining);
		},
		[filters, setFilterValues]
	);

	const clearFilters = useCallback(() => {
		setStoredFilters(EMPTY_TIME_ACTIVITY_FILTERS);
	}, [setStoredFilters]);

	const toggleColumn = useCallback(
		(column: TimeActivityColumn) => {
			const hiddenAfterToggle = withToggledColumn(hiddenColumns, column);
			setStoredColumns({ hiddenColumns: hiddenAfterToggle });
		},
		[hiddenColumns, setStoredColumns]
	);

	return {
		filters,
		activeFilterCount,
		setFilterValues,
		removeFilterValue,
		clearFilters,
		hiddenColumns,
		toggleColumn,
		grouping,
		setGrouping
	};
}

export type TimeActivitySettings = ReturnType<typeof useTimeActivitySettings>;
