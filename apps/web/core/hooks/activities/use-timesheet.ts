'use client';

/**
 * @deprecated This hook is deprecated. Use the individual CRUD hooks from `@/core/hooks/timesheet` instead:
 * - `useTimesheetQuery` — READ: query + params sync + data transformation
 * - `useCreateTimesheet` — WRITE: create timesheet entries
 * - `useUpdateTimesheet` — WRITE: update timesheet entries + status
 * - `useDeleteTimesheet` — WRITE: delete timesheet entries
 * - Pure functions: import directly from `@/core/lib/helpers/timesheet-grouping`
 *
 * This wrapper composes all split hooks for backward compatibility.
 * It will be removed in a future release.
 *
 * @see ETP-224 — Refactor useTimesheet: Separate Transformation from Data Fetching
 */

import { useTimesheetQuery } from '@/core/hooks/timesheet/use-timesheet-query';
import { useCreateTimesheet } from '@/core/hooks/timesheet/use-create-timesheet';
import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { useDeleteTimesheet } from '@/core/hooks/timesheet/use-delete-timesheet';
import {
	type TimesheetParams,
	groupByDate,
	getStatusTimesheet,
	groupedByTimesheetIds,
	rowsToObject
} from '@/core/lib/helpers/timesheet-grouping';

// Re-export types for backward compatibility
export type { GroupedTimesheet } from '@/core/lib/helpers/timesheet-grouping';

/** @deprecated Use individual hooks from `@/core/hooks/timesheet` instead */
export function useTimesheet(params: TimesheetParams) {
	const query = useTimesheetQuery(params);
	const { createTimesheet, loadingCreateTimesheet } = useCreateTimesheet();
	const { updateTimesheet, loadingUpdateTimesheet, updateTimesheetStatus, loadingUpdateTimesheetStatus } =
		useUpdateTimesheet();
	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useDeleteTimesheet();

	return {
		// Query state — NOTE: original returned grouped data as `timesheet`
		loadingTimesheet: query.loadingTimesheet,
		timesheet: query.timesheetElementGroup,
		getTaskTimesheet: query.getTaskTimesheet,

		// Delete
		loadingDeleteTimesheet,
		deleteTaskTimesheet,

		// Pure functions (direct re-exports for backward compat)
		getStatusTimesheet,
		groupByDate,
		groupedByTimesheetIds,
		rowsToObject,

		// Grouping & status
		timesheetGroupByDays: query.timesheetGroupByDays,
		statusTimesheet: query.statusTimesheet,

		// Update
		updateTimesheetStatus,
		loadingUpdateTimesheetStatus,

		// Filter options
		puTimesheetStatus: query.puTimesheetStatus,

		// Create
		createTimesheet,
		loadingCreateTimesheet,

		// Update content
		updateTimesheet,
		loadingUpdateTimesheet,

		// Misc
		isManage: query.isManage,
		normalizeText: query.normalizeText,
		setSelectTimesheetId: query.setSelectTimesheetId,
		selectTimesheetId: query.selectTimesheetId,
		handleSelectRowByStatusAndDate: query.handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet: query.handleSelectRowTimesheet,
		formatDate: query.formatDate,
		currentDateRange: query.currentDateRange
	};
}

