// ─── Timesheet CRUD Hooks ────────────────────────────────────────────────────
// Split from the original monolithic useTimesheet hook (ETP-224)
// following the CRUD-split pattern used across the codebase.

export { useTimesheetInvalidation } from './use-timesheet-invalidation';
export { useTimesheetQuery } from './use-timesheet-query';
export { useCreateTimesheet } from './use-create-timesheet';
export { useUpdateTimesheet } from './use-update-timesheet';
export { useDeleteTimesheet } from './use-delete-timesheet';
export { useUpdateTimeLogMutation } from './use-update-time-log';

// Re-export pure utility functions and types for convenience
export {
	type TimesheetParams,
	type GroupedTimesheet,
	areArraysEqual,
	groupByDate,
	groupByWeek,
	groupByMonth,
	reGroupByDate,
	getStatusTimesheet,
	isTimesheetStatus,
	groupedByTimesheetIds,
	rowsToObject
} from '@/core/lib/helpers/timesheet-grouping';
