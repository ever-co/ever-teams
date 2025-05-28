import * as React from 'react';
import DataTable from '@/core/components/common/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { IDailyPlan } from '@/core/types/interfaces/daily-plan/daily-plan';
import { ITask } from '@/core/types/interfaces/task/task';
import DailyPlanTaskEstimationCell from './cells/task-estimation-cell';
import DailyPlanTaskInfoCell from './cells/task-info-cell';
import DailyPlanTaskTimesCell from './cells/task-times-cell';
import TaskActionMenuCell from './cells/task-action-menu-cell';
import { FilterTabs, I_UserProfilePage } from '@/core/hooks';

interface IDailyPlanTasksTableViewProps {
	data: ITask[];
	plan: IDailyPlan;
	profile: I_UserProfilePage;
	planMode?: FilterTabs;
}

/**
 * Table view of daily plan tasks
 *
 * @param {Object} props - THe props object
 * @param {ITask[]} props.data - The tasks
 * @param {I_UserProfilePage} props.profile - The user profile page
 * @param {FilterTabs} props.planMode - The plan mode to display
 *
 * @returns {JSX.Element} - The table view of daily plan tasks
 */
export default function DailyPlanTasksTableView(props: IDailyPlanTasksTableViewProps) {
	const { data, plan, profile, planMode } = props;

	const columns = React.useMemo<ColumnDef<ITask>[]>(
		() => [
			{
				id: 'task',
				header: 'Task',
				tooltip: '',
				cell: DailyPlanTaskInfoCell
			},
			{
				id: 'estimate',
				header: 'Estimate',
				tooltip: '',
				cell: DailyPlanTaskEstimationCell,
				meta: {
					plan,
					profile
				}
			},
			{
				id: 'workedOn',
				header: 'Worked On',
				tooltip: '',
				cell: DailyPlanTaskTimesCell,
				meta: {
					profile
				}
			},
			{
				id: 'action',
				header: 'Action',
				tooltip: '',
				cell: TaskActionMenuCell,
				meta: {
					plan,
					profile,
					planMode
				}
			}
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return <DataTable isHeader={false} columns={columns} data={data} />;
}
