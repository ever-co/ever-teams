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
					header: t('task.teamMemberTableHead.TEAM_MEMBER'),
					tooltip: '',
					cell: UserInfoCell,
					meta: {
						publicTeam
					}
				},
				{
					id: 'task',
					header: t('task.teamMemberTableHead.TASK'),
					tooltip: '',
					cell: TaskCell
				},
				{
					id: 'workedOnTask',
					header: t('task.teamMemberTableHead.WORKED_ON_TASK'),
					tooltip: t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP'),
					cell: WorkedOnTaskCell
				},
				{
					id: 'estimate',
					header: t('task.teamMemberTableHead.ESTIMATE'),
					tooltip: '',
					cell: TaskEstimateInfoCell
				},
				{
					id: 'action',
					header: t('task.teamMemberTableHead.ACTION'),
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
						heading: t('common.NO_TEAM_MEMBERS_FOUND'),
						content: t('common.NO_TEAM_MEMBERS_FOUND_MESSAGE')
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
