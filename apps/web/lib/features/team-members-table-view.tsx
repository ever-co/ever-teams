import * as React from 'react';
import DataTable from '@components/ui/data-table';
import { Column, ColumnDef } from '@tanstack/react-table';
import { OT_Member } from '@app/interfaces';
import { UserInfoCell, TaskCell, WorkedOnTaskCell, TaskEstimateInfoCell, ActionMenuCell } from './team-member-cell';
import { useAuthenticateUser, useModal } from '@app/hooks';
import { InviteUserTeamCard } from './team/invite/user-invite-card';
import { InviteFormModal } from './team/invite/invite-form-modal';
import { useTranslations } from 'next-intl';

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
	const t = useTranslations();

	const columns = React.useMemo<ColumnDef<OT_Member>[]>(
		() => [
			{
				id: 'name',
				header: 'Team Member',
				tooltip: '',
				cell: UserInfoCell,
				meta: {
					publicTeam
				}
			},
			{
				id: 'task',
				header: 'Task',
				tooltip: '',
				cell: TaskCell
			},
			{
				id: 'workedOnTask',
				header: 'Worked on \n task',
				tooltip: t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP'),
				cell: WorkedOnTaskCell
			},
			{
				id: 'estimate',
				header: 'Estimate',
				tooltip: '',
				cell: TaskEstimateInfoCell
			},
			{
				id: 'action',
				header: 'Action',
				tooltip: '',
				cell: ActionMenuCell,
				meta: {
					active
				}
			}
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
				isHeader={false}
				columns={columns as Column<OT_Member>[]}
				data={sortedTeamMembers}
				isScrollable
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
