import { useMemo } from 'react';
import { GroupedTimesheet } from './use-timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { localDateKey } from '@/core/lib/helpers/timesheet-grouping';

type ViewMode = 'ListView' | 'CalendarView';
type GroupByDays = 'Daily' | 'Weekly' | 'Monthly';

interface TimesheetViewDataProps {
	timesheetNavigator: ViewMode;
	timesheetGroupByDays: GroupByDays;
	paginatedGroups?: GroupedTimesheet[];
	filterDataTimesheet?: GroupedTimesheet[];
}

export const useTimesheetViewData = ({
	timesheetNavigator,
	timesheetGroupByDays,
	paginatedGroups,
	filterDataTimesheet
}: TimesheetViewDataProps) => {
	const viewData = useMemo(() => {
		const shouldUsePaginatedGroups =
			timesheetNavigator === 'ListView' ||
			(timesheetGroupByDays === 'Daily' && timesheetNavigator === 'CalendarView');

		let result = shouldUsePaginatedGroups ? paginatedGroups : filterDataTimesheet;

		// Fallback: if result is empty but we have filterDataTimesheet, use it
		if ((!result || result.length === 0) && filterDataTimesheet && filterDataTimesheet.length > 0) {
			result = filterDataTimesheet;
		}

		// Special handling for CalendarView with Weekly/Monthly grouping
		if (
			timesheetNavigator === 'CalendarView' &&
			(timesheetGroupByDays === 'Weekly' || timesheetGroupByDays === 'Monthly') &&
			result
		) {
			// Convert weekly groups back to daily groups for calendar display. One group per local day across all the
			// week groups: the calendars key their days in a Map, so two groups of one day would drop one of them.
			// The local day, as groupByDate uses (a UTC key put evening entries west of UTC under the next day).
			const tasksByDate: Record<string, ITimeLog[]> = {};
			result.forEach((weekGroup) => {
				weekGroup.tasks.forEach((task) => {
					const taskDate = task.timesheet?.createdAt || task.createdAt || task.startedAt;
					const date = taskDate ? new Date(taskDate) : null;
					if (date && !Number.isNaN(date.getTime())) {
						const dateKey = localDateKey(date);
						if (!tasksByDate[dateKey]) {
							tasksByDate[dateKey] = [];
						}
						tasksByDate[dateKey].push(task);
					}
				});
			});
			result = Object.entries(tasksByDate)
				.map(([date, tasks]) => ({ date, tasks }))
				.sort((a, b) => b.date.localeCompare(a.date));
		}

		return result;
	}, [timesheetNavigator, timesheetGroupByDays, paginatedGroups, filterDataTimesheet]);

	return viewData;
};
