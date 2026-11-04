import { useAuthenticateUser, useModal } from '@/core/hooks';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { InviteUserTeamCard } from '../../../../../teams/invite/user-invite-card';
import { InviteFormModal } from '../../../../../features/teams/invite-form-modal';
import { useTranslations } from 'next-intl';
import { TeamMemberRowWrapper, TeamMemberTableRow } from './team-member-cells';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { memo } from 'react';
import { cn } from '@/core/lib/helpers';
import { MEMBER_TABLE_SURFACE } from '@/core/components/teams/member-row-grid';

const TeamMembersTableView = memo(
	({
		teamMembers,
		currentUser,
		publicTeam = false,
		active = false,
		statsPending = false
	}: {
		teamMembers: TOrganizationTeamEmployee[];
		currentUser?: TOrganizationTeamEmployee;
		publicTeam?: boolean;
		active?: boolean;
		statsPending?: boolean;
	}) => {
		const t = useTranslations();

		const sortedTeamMembers: TOrganizationTeamEmployee[] = [];
		if (currentUser) {
			sortedTeamMembers.push(currentUser);
		}
		sortedTeamMembers.push(...teamMembers);
		const hasMembers = sortedTeamMembers.length > 0;

		return (
			<div className={cn(MEMBER_TABLE_SURFACE, 'min-w-fit')}>
				{hasMembers && (
					<ul className="hairline-divide-y divide-border">
						{sortedTeamMembers.map((member) => (
							<li key={member.id}>
								<TeamMemberRowWrapper data={member}>
									<TeamMemberTableRow
										publicTeam={publicTeam}
										active={active}
										statsPending={statsPending}
									/>
								</TeamMemberRowWrapper>
							</li>
						))}
					</ul>
				)}
				{!hasMembers && (
					<div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
						<p className="text-sm font-medium text-foreground">{t('common.NO_TEAM_MEMBERS_FOUND')}</p>
						<p className="text-sm text-muted-foreground">{t('common.NO_TEAM_MEMBERS_FOUND_MESSAGE')}</p>
					</div>
				)}
				<Invite />
			</div>
		);
	}
);

function Invite() {
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();
	// The API refuses an invitation into a team the user does not manage (403): show the card only to who may send it.
	const canInvite = useCanInviteToActiveTeam();

	if (!canInvite) return null;

	return (
		<div className="hairline-t border-dashed border-border">
			<InviteUserTeamCard active={user?.isEmailVerified} onClick={openModal} />
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</div>
	);
}

export default TeamMembersTableView;
