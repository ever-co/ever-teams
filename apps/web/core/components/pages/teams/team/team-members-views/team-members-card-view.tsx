import { useIsMemberManager, useModal, useOrganizationEmployeeTeams } from '@/core/hooks';
import { Transition } from '@headlessui/react';
import React, { memo, useCallback, useMemo, useState } from 'react';
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
import {
	membersWithPendingOrders,
	ordersAfterSwap,
	sortByOrder,
	type TPendingMemberOrders
} from '@/core/lib/helpers/team-member-order';
import { TEAM_MEMBER_CONSTANTS } from '@/core/lib/utils/team-members.utils';

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

// The viewer's own card sits outside the ordered list, so it is neither dragged nor dropped on
const noDragHandler = () => null;

const TeamMembersCardView: React.FC<Props> = memo(
	({ teamMembers, currentUser, teamsFetching = false, publicTeam = false, statsPending = false }) => {
		const { data: user } = useUserQuery();

		const { isTeamManager } = useIsMemberManager(user);

		const { teamInvitations } = useTeamInvitationsQuery();

		const { updateOrganizationTeamEmployeeOrderOnList } = useOrganizationEmployeeTeams();

		const dragTeamMember = React.useRef<number>(0);
		const draggedOverTeamMember = React.useRef<number>(0);

		// A drop shows at once with the orders being saved, and holds until they have all settled; one drop at a
		// time, so overlapping saves never mix their orders
		const [pendingOrders, setPendingOrders] = useState<TPendingMemberOrders | null>(null);
		const isSavingOrder = pendingOrders !== null;
		const members = useMemo(
			() => membersWithPendingOrders(teamMembers, pendingOrders),
			[teamMembers, pendingOrders]
		);

		// Read through refs so handleSort keeps its identity and does not re-render every memoized card
		const membersRef = useSyncRef(members);
		const currentUserRef = useSyncRef(currentUser);
		const isSavingOrderRef = useSyncRef(isSavingOrder);

		const handleSort = useCallback(() => {
			const draggedIndex = dragTeamMember.current;
			const targetIndex = draggedOverTeamMember.current;
			const draggedMember = membersRef.current[draggedIndex];
			const targetMember = membersRef.current[targetIndex];
			const isMemberMissing = !draggedMember || !targetMember;
			const isSameMember = draggedMember?.id === targetMember?.id;
			const hasNothingToMove = isMemberMissing || isSameMember;
			if (hasNothingToMove || isSavingOrderRef.current) {
				return;
			}
			// The viewer's own card is shown apart but holds a place in the team's order that the other members see:
			// it is ranked with them where it sorts, or every drop would leave it unranked and last for the team. A
			// placeholder card (a viewer the team does not list yet) has no membership to save.
			const viewer = currentUserRef.current;
			const viewerId = viewer?.id ?? '';
			const isListedViewer = viewerId !== '' && !viewerId.startsWith(TEAM_MEMBER_CONSTANTS.TEMP_ID_PREFIX);
			let rankedMembers = membersRef.current;
			if (viewer && isListedViewer) {
				rankedMembers = [...membersRef.current, viewer].sort(sortByOrder);
			}
			const nextOrders = ordersAfterSwap(
				rankedMembers,
				rankedMembers.indexOf(draggedMember),
				rankedMembers.indexOf(targetMember)
			);
			setPendingOrders(nextOrders);
			const reorderedMembers = rankedMembers.filter((member) => member.id in nextOrders);
			const saves = reorderedMembers.map((member) =>
				updateOrganizationTeamEmployeeOrderOnList(member, nextOrders[member.id])
			);
			// Each save reloads the teams as it settles (a failure also shows its message), so once all have settled
			// the list reads the order the API holds
			void Promise.allSettled(saves).then(() => setPendingOrders(null));
		}, [membersRef, currentUserRef, isSavingOrderRef, updateOrganizationTeamEmployeeOrderOnList]);

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
								draggable={false}
								currentExit={false}
								onDragStart={noDragHandler}
								onDragEnter={noDragHandler}
								onDragEnd={noDragHandler}
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
									draggable={isTeamManager && !isSavingOrder}
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
