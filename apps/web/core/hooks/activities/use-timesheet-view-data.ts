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

		return shouldUsePaginatedGroups ? paginatedGroups : filterDataTimesheet;
	}, [timesheetNavigator, timesheetGroupByDays, paginatedGroups, filterDataTimesheet]);

	return viewData;
};
