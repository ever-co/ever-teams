'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { useReportUrlFilters } from '@/core/hooks/dashboards/use-report-url-filters';
import type { ReportUrlFilterField } from '@/core/lib/utils/dashboards/report-filters';
import {
	EMPTY_STORED_TIME_ACTIVITY_FILTERS,
	type StoredTimeActivityFilterField,
	type StoredTimeActivityFilters,
	TIME_ACTIVITY_COLUMNS_STORAGE_KEY,
	TIME_ACTIVITY_FILTERS_STORAGE_KEY,
	type TimeActivityColumn,
	type TimeActivityFilterField,
	type TimeActivityFilters,
	type TimeActivityGrouping,
	activeFilterCountOf,
	filtersFromStorage,
	hiddenColumnsFromStorage,
	isStoredTimeActivityFilterField
} from '@/core/lib/utils/dashboards/time-activity';

type LinkedFilterField = Exclude<TimeActivityFilterField, StoredTimeActivityFilterField>;

const URL_FIELD_OF: Record<LinkedFilterField, ReportUrlFilterField> = {
	clientIds: 'clients',
	billable: 'billable'
};

function withToggledColumn(hidden: TimeActivityColumn[], column: TimeActivityColumn) {
	const isHidden = hidden.includes(column);
	if (isHidden) {
		return hidden.filter((current) => current !== column);
	}
	return [...hidden, column];
}

/**
 * Teams, members, projects and tasks stay saved in the browser, as before; the client and billable filters live in
 * the page link. The page reads them as one set of filters and clears them together.
 */
export function useTimeActivitySettings() {
	const [storedFilters, setStoredFilters] = useLocalStorageState<unknown>(TIME_ACTIVITY_FILTERS_STORAGE_KEY, null);
	const [storedColumns, setStoredColumns] = useLocalStorageState<unknown>(TIME_ACTIVITY_COLUMNS_STORAGE_KEY, null);
	const [grouping, setGrouping] = useState<TimeActivityGrouping>('date');
	const {
		filters: linkedFilters,
		setFilter: setLinkedFilter,
		clearFilters: clearLinkedFilters
	} = useReportUrlFilters();

	const savedFilters = useMemo(() => filtersFromStorage(storedFilters), [storedFilters]);
	const filters = useMemo<TimeActivityFilters>(
		() => ({ ...savedFilters, clientIds: linkedFilters.clients, billable: linkedFilters.billable }),
		[linkedFilters.billable, linkedFilters.clients, savedFilters]
	);
	const hiddenColumns = useMemo(() => hiddenColumnsFromStorage(storedColumns), [storedColumns]);
	const activeFilterCount = activeFilterCountOf(filters);

	const setFilterValues = useCallback(
		(field: TimeActivityFilterField, values: string[]) => {
			if (isStoredTimeActivityFilterField(field)) {
				const nextFilters: StoredTimeActivityFilters = { ...savedFilters, [field]: values };
				setStoredFilters(nextFilters);
				return;
			}
			setLinkedFilter(URL_FIELD_OF[field], values);
		},
		[savedFilters, setLinkedFilter, setStoredFilters]
	);

	const removeFilterValue = useCallback(
		(field: TimeActivityFilterField, value: string) => {
			const remaining = filters[field].filter((current) => current !== value);
			setFilterValues(field, remaining);
		},
		[filters, setFilterValues]
	);

	const clearFilters = useCallback(() => {
		setStoredFilters(EMPTY_STORED_TIME_ACTIVITY_FILTERS);
		clearLinkedFilters();
	}, [clearLinkedFilters, setStoredFilters]);

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
