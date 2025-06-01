import { useMemo } from 'react';
import { GroupedTimesheet } from './use-timesheet';

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
			// Convert weekly groups back to daily groups for calendar display
			const dailyGroups: GroupedTimesheet[] = [];
			result.forEach((weekGroup) => {
				// For each task in the week group, create a daily group based on the task's actual date
				const tasksByDate: Record<string, any[]> = {};
				weekGroup.tasks.forEach((task) => {
					const taskDate = task.timesheet?.createdAt || task.createdAt || task.startedAt;
					if (taskDate) {
						const dateKey = new Date(taskDate).toISOString().split('T')[0];
						if (!tasksByDate[dateKey]) {
							tasksByDate[dateKey] = [];
						}
						tasksByDate[dateKey].push(task);
					}
				});

				// Create daily groups from the tasks
				Object.entries(tasksByDate).forEach(([date, tasks]) => {
					dailyGroups.push({ date, tasks });
				});
			});
			result = dailyGroups.sort((a, b) => b.date.localeCompare(a.date));
		}

		return result;
	}, [timesheetNavigator, timesheetGroupByDays, paginatedGroups, filterDataTimesheet]);

	return viewData;
};
