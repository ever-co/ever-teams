import { useIsMemberManager, useModal, useOrganizationEmployeeTeams } from '@/core/hooks';
import { Transition } from '@headlessui/react';
import React, { memo, useCallback, useMemo } from 'react';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { InviteUserTeamSkeleton, UserTeamCardSkeleton } from './team-members-header';
import { UserTeamCard } from './user-team-card';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { InvitedCard, InviteUserTeamCard } from '@/core/components/teams/invite/user-invite-card';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { EInviteStatus } from '@/core/types/generics/enums/invite';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { clsxm } from '@/core/lib/utils';
import { MEMBER_CARD } from '@/core/components/teams/member-row-grid';

interface Props {
	teamMembers: TOrganizationTeamEmployee[];
	publicTeam: boolean;
	currentUser?: TOrganizationTeamEmployee;
	teamsFetching: boolean;
	statsPending?: boolean;
}

export { MEMBER_CARD };

/** The signed-in member's card: one primary hairline and a shadow tinted with the same hue, never a second ring around it. */
const OWN_MEMBER_CARD =
	'ring-primary/45 shadow-[0_1px_2px_hsl(var(--primary)/0.10),0_8px_24px_-10px_hsl(var(--primary)/0.38)] hover:shadow-[0_1px_2px_hsl(var(--primary)/0.12),0_10px_26px_-10px_hsl(var(--primary)/0.45)] dark:ring-primary/55';

const INVITE_SLOT_CARD = 'rounded-xl hairline-border border-dashed border-foreground/15';

const TeamMembersCardView: React.FC<Props> = memo(
	({ teamMembers: members, currentUser, teamsFetching = false, publicTeam = false, statsPending = false }) => {
		const { data: user } = useUserQuery();

		const { isTeamManager } = useIsMemberManager(user);

		const { teamInvitations } = useTeamInvitationsQuery();

		const { updateOrganizationTeamEmployeeOrderOnList } = useOrganizationEmployeeTeams();

		// TODO: sort teamMembers by index
		const dragTeamMember = React.useRef<number>(0);
		const draggedOverTeamMember = React.useRef<number>(0);

		const handleChangeOrder = useCallback(
			(employee: TOrganizationTeamEmployee, order: number) => {
				updateOrganizationTeamEmployeeOrderOnList(employee, order);
			},
			[updateOrganizationTeamEmployeeOrderOnList]
		);

		// Read through a ref so handleSort keeps its identity and does not re-render every memoized card
		const membersRef = useSyncRef(members);

		const handleSort = useCallback(() => {
			const peopleClone = [...membersRef.current];
			const temp = peopleClone[dragTeamMember.current];
			peopleClone[dragTeamMember.current] = peopleClone[draggedOverTeamMember.current];
			peopleClone[draggedOverTeamMember.current] = temp;
			// TODO: update teamMembers index
			handleChangeOrder(peopleClone[dragTeamMember.current], draggedOverTeamMember.current);
			handleChangeOrder(peopleClone[draggedOverTeamMember.current], dragTeamMember.current);
		}, [membersRef, dragTeamMember, draggedOverTeamMember, handleChangeOrder]);

		const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => e.preventDefault(), []);

		// One stable pair of handlers per list position, so a card only re-renders when its own props change
		const dragHandlers = useMemo(
			() =>
				Array.from({ length: Math.max(members.length, 1) }, (_, i) => ({
					onDragStart: () => {
						dragTeamMember.current = i;
					},
					onDragEnter: () => {
						draggedOverTeamMember.current = i;
					}
				})),
			[members.length]
		);

		return (
			<>
				<ul className="flex flex-col gap-2">
					{/* Current authenticated user members - Always show if user exists */}
					{currentUser && (
						<li className={clsxm(MEMBER_CARD, OWN_MEMBER_CARD)}>
							<UserTeamCard
								member={currentUser}
								active
								publicTeam={publicTeam}
								statsPending={statsPending}
								draggable={true}
								currentExit={false}
								onDragStart={dragHandlers[0].onDragStart}
								onDragEnter={dragHandlers[0].onDragEnter}
								onDragEnd={handleSort}
								onDragOver={handleDragOver}
							/>
						</li>
					)}

					{/* Team members list: rows already there on load do not animate (design law, motion) */}
					{members.map((member, i) => {
						return (
							<li key={member.id} className={MEMBER_CARD}>
								<UserTeamCard
									member={member}
									publicTeam={publicTeam}
									statsPending={statsPending}
									currentExit={draggedOverTeamMember.current == i}
									draggable={isTeamManager}
									onDragStart={dragHandlers[i].onDragStart}
									onDragEnter={dragHandlers[i].onDragEnter}
									onDragEnd={handleSort}
									onDragOver={handleDragOver}
								/>
							</li>
						);
					})}

					{teamInvitations.length > 0 &&
						teamInvitations
							.filter((invitation) => invitation.status !== EInviteStatus.ACCEPTED)
							.map((invitation) => (
								<li key={invitation.id} className={MEMBER_CARD}>
									<InvitedCard invitation={invitation} />
								</li>
							))}

					{/* Loader skeleton */}
					<Transition
						show={teamsFetching}
						enter="transition-opacity duration-75"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity duration-150"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						{[0, 2].map((_, i) => {
							return (
								<li key={i} className={MEMBER_CARD}>
									<UserTeamCardSkeleton />
								</li>
							);
						})}
						<li className={MEMBER_CARD}>
							<InviteUserTeamSkeleton />
						</li>
					</Transition>
					{/* Invite button */}
					<Transition
						show={isTeamManager}
						enter="transition-opacity duration-75"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity duration-150"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<li className={INVITE_SLOT_CARD}>
							<Invite />
						</li>
					</Transition>
				</ul>
			</>
		);
	}
);

function Invite() {
	const { data: user } = useUserQuery();
	const { openModal, isOpen, closeModal } = useModal();

	return (
		<>
			<InviteUserTeamCard active={user?.isEmailVerified} onClick={openModal} />
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}

export default TeamMembersCardView;
