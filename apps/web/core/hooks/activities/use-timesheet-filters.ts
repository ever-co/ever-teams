import { useMemo } from 'react';
import { FilterStatus } from '@/core/components/timesheet/filter-with-status';
import { GroupedTimesheet } from './use-timesheet';
import { ETimesheetStatus } from '@/core/types/interfaces/enums/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { useLocalStorageState } from '../common/use-local-storage-state';

export const useTimesheetFilters = (data?: GroupedTimesheet[]) => {
	const [activeStatus, setActiveStatus] = useLocalStorageState<FilterStatus>('timesheet-filter-status', 'All Tasks');

	const filteredData = useMemo(() => {
		if (!data) return [];

		return data
			.map((group) => {
				type FilterStatusWithoutAll = Exclude<FilterStatus, 'All Tasks'>;

				const statusMap: Record<FilterStatusWithoutAll, ETimesheetStatus> = {
					Pending: ETimesheetStatus.PENDING,
					Approved: ETimesheetStatus.APPROVED,
					'In review': ETimesheetStatus.IN_REVIEW,
					Draft: ETimesheetStatus.DRAFT,
					Rejected: ETimesheetStatus.DENIED
				};

				const filteredTasks = group.tasks.filter((task) => {
					if (activeStatus === 'All Tasks') {
						return true;
					}
					return task.timesheet?.status === statusMap[activeStatus as FilterStatusWithoutAll];
				});

				return {
					...group,
					tasks: filteredTasks
				};
			})
			.filter((group) => group.tasks.length > 0);
	}, [data, activeStatus]);

	const statusData = useMemo(() => {
		const emptyStatusData: Record<ETimesheetStatus, ITimeLog[]> = {
			DRAFT: [],
			PENDING: [],
			'IN REVIEW': [],
			DENIED: [],
			APPROVED: []
		};

		if (!data) return emptyStatusData;

		const allTasks = data.flatMap((group) => group.tasks);
		return allTasks.reduce(
			(acc, task) => {
				const status = task.timesheet?.status;
				if (status) acc[status].push(task);
				return acc;
			},
			{ ...emptyStatusData }
		);
	}, [data]);

	return {
		activeStatus,
		setActiveStatus,
		filteredData,
		statusData
	};
};
