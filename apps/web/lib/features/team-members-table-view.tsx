import * as React from 'react';
import DataTable from '@components/ui/data-table';
import { Column, ColumnDef } from '@tanstack/react-table';
import { OT_Member } from '@app/interfaces';
import { UserInfoCell, TaskCell, WorkedOnTaskCell, TaskEstimateInfoCell, ActionMenuCell } from './team-member-cell';
import { useAuthenticateUser, useModal } from '@app/hooks';
import { InviteUserTeamCard } from './team/invite/user-invite-card';
import { InviteFormModal } from './team/invite/invite-form-modal';

const TeamMembersTableView = ({
	teamMembers,
	currentUser,
	publicTeam = false,
	active = false
}: {
	teamMembers: OT_Member[];
	currentUser: OT_Member | undefined;
	publicTeam?: boolean;
	active?: boolean;
}) => {
	const columns = React.useMemo<ColumnDef<OT_Member>[]>(
		() => [
			{
				id: 'name',
				header: 'Name',
				cell: UserInfoCell,
				meta: {
					publicTeam
				}
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
				cell: ActionMenuCell,
				meta: {
					active
				}
			}
		],
		[]
	);

	const sortedTeamMembers: OT_Member[] = [];
	if (currentUser) {
		sortedTeamMembers.push(currentUser);
	}
	sortedTeamMembers.push(...teamMembers);

	return (
		<>
			<DataTable
				columns={columns as Column<OT_Member>[]}
				data={sortedTeamMembers}
				noResultsMessage={{
					heading: 'No team members found',
					content: 'Try adjusting your search or filter to find what you’re looking for.'
				}}
			/>
			<Invite />
		</>
	);
};

function Invite() {
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();

	return (
		<div className="py-2">
			<InviteUserTeamCard active={user?.isEmailVerified} onClick={openModal} />
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</div>
	);
}

export default TeamMembersTableView;
