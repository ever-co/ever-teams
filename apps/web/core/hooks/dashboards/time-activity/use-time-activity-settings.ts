'use client';

import { useCallback, useMemo } from 'react';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { useReportUrlFilters } from '@/core/hooks/dashboards/use-report-url-filters';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { canReadClients } from '@/core/lib/utils/clients';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { clearReportUrlFilters, type ReportUrlFilterField } from '@/core/lib/utils/dashboards/report-filters';
import {
	EMPTY_STORED_TIME_ACTIVITY_FILTERS,
	type StoredTimeActivityFilterField,
	type StoredTimeActivityFilters,
	TIME_ACTIVITY_COLUMNS_STORAGE_KEY,
	TIME_ACTIVITY_FILTERS_STORAGE_KEY,
	TIME_ACTIVITY_GROUPING_PARAM,
	type TimeActivityColumn,
	type TimeActivityFilterField,
	type TimeActivityFilters,
	type TimeActivityGrouping,
	activeFilterCountOf,
	clientGroupingAccessOf,
	effectiveGroupingOf,
	filtersFromStorage,
	groupingOfParam,
	groupingParamOf,
	hiddenColumnsFromStorage,
	isStoredTimeActivityFilterField,
	offeredGroupingsOf
} from '@/core/lib/utils/dashboards/time-activity';
import {
	clearLinkedFilters,
	linkedFiltersOf,
	periodOfLink,
	writeLinkedFilters,
	writePeriodToLink
} from '@/core/lib/utils/dashboards/time-activity-link';

type LinkedFilterField = Exclude<TimeActivityFilterField, StoredTimeActivityFilterField>;

const URL_FIELD_OF: Record<LinkedFilterField, ReportUrlFilterField> = {
	clientIds: 'clients',
	billable: 'billable',
	entryLabels: 'entryLabels'
};

function withToggledColumn(hidden: TimeActivityColumn[], column: TimeActivityColumn) {
	const isHidden = hidden.includes(column);
	if (isHidden) {
		return hidden.filter((current) => current !== column);
	}
	return [...hidden, column];
}

/**
 * The page link holds the view: the period, every filter and the grouping, so a copied address opens the same report.
 * Teams, members, projects and tasks also stay saved in the browser, as before: a visit whose link names no period
 * opens on them, and the page then writes them into its link. The page reads the filters as one set and clears them
 * together.
 */
export function useTimeActivitySettings() {
	const [storedFilters, setStoredFilters] = useLocalStorageState<unknown>(TIME_ACTIVITY_FILTERS_STORAGE_KEY, null);
	const [storedColumns, setStoredColumns] = useLocalStorageState<unknown>(TIME_ACTIVITY_COLUMNS_STORAGE_KEY, null);
	const {
		filters: linkedFilters,
		params: linkParams,
		setFilter: setLinkedFilter,
		setParam: setLinkParam,
		setParams: setLinkParams
	} = useReportUrlFilters();
	const weekStart = useWorkspaceWeekStart();
	const linkedPeriod = useMemo(() => periodOfLink(linkParams, weekStart), [linkParams, weekStart]);
	const holdsView = linkedPeriod !== null;
	const {
		myPermissions,
		isLoaded: arePermissionsLoaded,
		isLoading: arePermissionsLoading
	} = useMyRolePermissionsQuery();
	const mayReadClients = canReadClients(myPermissions);
	const arePermissionsPending = !arePermissionsLoaded && arePermissionsLoading;
	const clientGroupingAccess = clientGroupingAccessOf(mayReadClients, arePermissionsPending);
	const groupingParam = linkParams.get(TIME_ACTIVITY_GROUPING_PARAM);
	const linkedGrouping = groupingOfParam(groupingParam);
	// The Label grouping (Gauzy #12029) only where the API stores the labels of entries
	const supportsEntryLabels = useEntryLabelsSupport();
	const grouping = effectiveGroupingOf(linkedGrouping, clientGroupingAccess, supportsEntryLabels);
	const groupings = useMemo(
		() => offeredGroupingsOf(clientGroupingAccess, linkedGrouping, supportsEntryLabels),
		[clientGroupingAccess, linkedGrouping, supportsEntryLabels]
	);

	const setGrouping = useCallback(
		(nextGrouping: TimeActivityGrouping) => {
			const value = groupingParamOf(nextGrouping);
			setLinkParam(TIME_ACTIVITY_GROUPING_PARAM, value);
		},
		[setLinkParam]
	);

	const savedFilters = useMemo(() => {
		if (holdsView) {
			return linkedFiltersOf(linkParams);
		}
		return filtersFromStorage(storedFilters);
	}, [holdsView, linkParams, storedFilters]);
	const filters = useMemo<TimeActivityFilters>(
		() => ({
			...savedFilters,
			clientIds: linkedFilters.clients,
			billable: linkedFilters.billable,
			entryLabels: linkedFilters.entryLabels
		}),
		[linkedFilters.billable, linkedFilters.clients, linkedFilters.entryLabels, savedFilters]
	);
	const hiddenColumns = useMemo(() => hiddenColumnsFromStorage(storedColumns), [storedColumns]);
	const activeFilterCount = activeFilterCountOf(filters);

	const setFilterValues = useCallback(
		(field: TimeActivityFilterField, values: string[]) => {
			if (isStoredTimeActivityFilterField(field)) {
				const nextFilters: StoredTimeActivityFilters = { ...savedFilters, [field]: values };
				setStoredFilters(nextFilters);
				if (holdsView) {
					setLinkParams((next) => writeLinkedFilters(next, nextFilters));
				}
				return;
			}
			setLinkedFilter(URL_FIELD_OF[field], values);
		},
		[holdsView, savedFilters, setLinkParams, setLinkedFilter, setStoredFilters]
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
		setLinkParams((next) => {
			clearReportUrlFilters(next);
			clearLinkedFilters(next);
		});
	}, [setLinkParams, setStoredFilters]);

	/**
	 * Writes the period into the link. The first write also writes the four filters saved in the browser, so from then
	 * on the link holds the whole view.
	 */
	const setPeriod = useCallback(
		(period: Period) => {
			setLinkParams((next) => {
				writePeriodToLink(next, period, weekStart);
				if (!holdsView) {
					writeLinkedFilters(next, savedFilters);
				}
			});
		},
		[holdsView, savedFilters, setLinkParams, weekStart]
	);

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
		groupings,
		setGrouping,
		clientGroupingAccess,
		/** The period the link names; `null` until the page writes one into it. */
		linkedPeriod,
		holdsView,
		setPeriod,
		/** Changes values of the link in one move: how a saved report opens. */
		setLinkParams
	};
}

export type TimeActivitySettings = ReturnType<typeof useTimeActivitySettings>;
