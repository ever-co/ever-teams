import * as React from 'react';
import DataTable from '@components/ui/data-table'
import { Column, ColumnDef } from '@tanstack/react-table';
import { useTMCardTaskEdit, useTeamMemberCard, useCollaborative } from '@app/hooks';
import { UserInfo } from './team/user-team-card/user-info';
import { TaskInfo } from './team/user-team-card/task-info';
import { TaskTimes } from './task/task-times';
import { TaskEstimateInfo } from './team/user-team-card/task-estimate';
import { OT_Member } from '@app/interfaces';
import { UserTeamCardMenu } from './team/user-team-card/user-team-card-menu';
import { InputField } from 'lib/components';
import { clsxm } from '@app/utils';


interface Props {
	teamMembers: OT_Member[];
}

const TaskCell: React.FC<{ member: OT_Member }> = ({ member }) => {
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo?.memberTask);
	const publicTeam = false;

	return (
		<TaskInfo
			edition={taskEdition}
			memberInfo={memberInfo}
			className="2xl:w-80 3xl:w-[32rem] w-1/5 lg:px-4 px-2"
			publicTeam={publicTeam}
		/>
	);
};

const UseInfoCell: React.FC<{ member: OT_Member }> = ({ member }) => {
	const memberInfo = useTeamMemberCard(member);
	const publicTeam = false;

	return (
		<UserInfo
			memberInfo={memberInfo}
			className="2xl:w-[20.625rem] w-1/4"
			publicTeam={publicTeam}
		/>
	);
}

const WorkedOnTaskCell: React.FC<{ member: OT_Member }> = ({ member }) => {
	const memberInfo = useTeamMemberCard(member);

	return (
		<TaskTimes
			activeAuthTask={true}
			memberInfo={memberInfo}
			task={memberInfo?.memberTask}
			isAuthUser={memberInfo?.isAuthUser}
			className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
		/>
	);
}

const TaskEstimateInfoCell: React.FC<{ member: OT_Member}> = ({ member }) => {

	const memberInfo = useTeamMemberCard(member);
    const taskEdition = useTMCardTaskEdit(memberInfo?.memberTask);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className="lg:px-3 2xl:w-52 3xl:w-64 w-1/5"
		/>
	);
}

const ActionMenuCell: React.FC<{ member: OT_Member }> = ({ member }) => {
	const memberInfo = useTeamMemberCard(member);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(
		memberInfo.memberUser
	);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const active = true

	return (
		<>
			{(!collaborativeSelect || active) && (
				<UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />
			)}

			{collaborativeSelect && !active && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm(
						'border-none w-4 h-4 mr-1 accent-primary-light',
						'border-2 border-primary-light'
					)}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
}

const TeamMembersTableView: React.FC<Props> = ({ teamMembers }) => {
	const columns = React.useMemo<ColumnDef<OT_Member>[]>(
		() => [
			{
				id: 'name',
				header: 'Name',
				cell: ({ row }) => {
					const member = row.original;
					return <UseInfoCell member={member} />;
				},
			},
			{
				id: 'task',
				header: 'Task',
				cell: ({ row }) => {
					const member = row.original;

					return <TaskCell member={member} />;
				},
			},
			{
				id: 'workedOnTask',
				header: 'Worked on task',
				cell: ({ row }) => {
					const member = row.original;
					return <WorkedOnTaskCell member={member} />;
				},
			},
			{
				id: 'estimate',
				header: 'Estimate',
				cell: ({ row }) => {
					const member = row.original;

					return <TaskEstimateInfoCell member={member} />;
				}
			},
			{
				id: 'action',
				header: 'Action',
				cell: ({ row }) => {
					const member = row.original;

					return <ActionMenuCell member={member} />;
				}

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
