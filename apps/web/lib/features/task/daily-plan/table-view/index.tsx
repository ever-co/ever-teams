import * as React from 'react';
import DataTable from '@components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import DailyPlanTaskEstimationCell from './cells/task-estimation-cell';
import DailyPlanTaskInfoCell from './cells/task-info-cell';
import DailyPlanTaskTimesCell from './cells/task-times-cell';
import TaskActionMenuCell from './cells/task-action-menu-cell';
import { FilterTabs, I_UserProfilePage } from '@/app/hooks';

interface IDailyPlanTasksTableViewProps {
	data: ITeamTask[];
	plan: IDailyPlan;
	profile: I_UserProfilePage;
	planMode?: FilterTabs;
}

/**
 * Table view of daily plan tasks
 *
 * @param {Object} props - THe props object
 * @param {ITeamTask[]} props.data - The tasks
 * @param {I_UserProfilePage} props.profile - The user profile page
 * @param {FilterTabs} props.planMode - The plan mode to display
 *
 * @returns {JSX.Element} - The table view of daily plan tasks
 */
export default function DailyPlanTasksTableView(props: IDailyPlanTasksTableViewProps) {
	const { data, plan, profile, planMode } = props;

	const columns = React.useMemo<ColumnDef<ITeamTask>[]>(
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
