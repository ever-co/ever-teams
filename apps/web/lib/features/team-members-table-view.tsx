import * as React from 'react';
import DataTable from '@components/ui/data-table'
import { Column, ColumnDef } from '@tanstack/react-table';
import { OT_Member } from '@app/interfaces';
import { UserInfoCell, TaskCell, WorkedOnTaskCell, TaskEstimateInfoCell, ActionMenuCell } from './team-member-cell';


const TeamMembersTableView= ({ teamMembers }: { teamMembers: OT_Member[] }) => {
	const columns = React.useMemo<ColumnDef<OT_Member>[]>(
		() => [
			{
				id: 'name',
				header: 'Name',
				cell: UserInfoCell
			},
			{
				id: 'task',
				header: 'Task',
				cell: TaskCell
			},
			{
				id: 'workedOnTask',
				header: 'Worked on task',
				cell: WorkedOnTaskCell
			},
			{
				id: 'estimate',
				header: 'Estimate',
				cell: TaskEstimateInfoCell
			},
			{
				id: 'action',
				header: 'Action',
				cell: ActionMenuCell
			}
		],
		[]
	);

	return (
		<DataTable
			columns={columns as Column<OT_Member>[]}
			data={teamMembers}
			noResultsMessage={{
				heading: 'No team members found',
				content: 'Try adjusting your search or filter to find what you’re looking for.',
			}}
		/>
	);
};


export default TeamMembersTableView;
