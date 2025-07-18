import * as React from 'react';
import DataTable from '@/core/components/common/data-table';
import { ColumnDef } from '@tanstack/react-table';

import { useAuthenticateUser, useModal } from '@/core/hooks';
import { InviteUserTeamCard } from '../../../../../teams/invite/user-invite-card';
import { InviteFormModal } from '../../../../../features/teams/invite-form-modal';
import { useTranslations } from 'next-intl';
import { ActionMenuCell, TaskCell, TaskEstimateInfoCell, UserInfoCell, WorkedOnTaskCell } from './team-member-cells';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { memo } from 'react';

const TeamMembersTableView = memo(
	({
		teamMembers,
		currentUser,
		publicTeam = false,
		active = false
	}: {
		teamMembers: TOrganizationTeamEmployee[];
		currentUser?: TOrganizationTeamEmployee;
		publicTeam?: boolean;
		active?: boolean;
	}) => {
		const t = useTranslations();

		const columns = React.useMemo<ColumnDef<TOrganizationTeamEmployee>[]>(
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
			[t]
		);

		const sortedTeamMembers: TOrganizationTeamEmployee[] = [];
		if (currentUser) {
			sortedTeamMembers.push(currentUser);
		}
		sortedTeamMembers.push(...teamMembers);

		return (
			<>
				<DataTable
					isHeader={false}
					columns={columns}
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
	}
);

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
