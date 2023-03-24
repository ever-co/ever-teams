import {
	useAuthenticateUser,
	useModal,
	useOrganizationTeams,
	useTeamInvitations,
} from '@app/hooks';
import { Transition } from '@headlessui/react';
import { InviteFormModal } from './team/invite/invite-form-modal';
import {
	InvitedCard,
	InviteUserTeamCard,
} from './team/invite/user-invite-card';
import { InviteUserTeamSkeleton, UserTeamCard, UserTeamCardSkeleton } from '.';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from '@components/shared/skeleton/InviteTeamCardSkeleton';
// import { useEffect } from 'react';

export function TeamMembers({ publicTeam = false }: { publicTeam?: boolean }) {
	const { isTeamManager, user } = useAuthenticateUser();
	const { activeTeam, teamsFetching } = useOrganizationTeams();
	const { teamInvitations } = useTeamInvitations();

	const members = activeTeam?.members || [];
	const $teamsFetching = teamsFetching && members.length === 0;

	const currentUser = members.find((m) => {
		return m.employee.userId === user?.id;
	});

	const $members = members.filter((m) => {
		return m.employee.user?.id !== user?.id;
	});

	return members.length === 0 ? (
		<div className="">
			<UserTeamCardSkeletonCard />
			<InviteUserTeamCardSkeleton />
		</div>
	) : (
		<ul className="mt-7">
			{/* Current authenticated user members */}
			<Transition
				show={!!currentUser}
				enter="transition-opacity duration-75"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-150"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				<li className="mb-4">
					<UserTeamCard member={currentUser} active publicTeam={publicTeam} />
				</li>
			</Transition>

			{/* Team members list */}
			{$members.map((member) => {
				return (
					<Transition
						key={member.id}
						show={true}
						enter="transition-opacity duration-75"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity duration-150"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<li className="mb-4">
							<UserTeamCard member={member} publicTeam={publicTeam} />
						</li>
					</Transition>
				);
			})}

			{members.length > 0 &&
				teamInvitations.map((invitation) => (
					<li key={invitation.id} className="mb-4">
						<InvitedCard invitation={invitation} />
					</li>
				))}

			{/* Loader skeleton */}
			<Transition
				show={$teamsFetching}
				enter="transition-opacity duration-75"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-150"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				{[1, 2].map((_, i) => {
					return (
						<li key={i} className="mt-3">
							<UserTeamCardSkeleton />
						</li>
					);
				})}
				<li>
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
				<li className="mb-4">
					<Invite />
				</li>
			</Transition>
		</ul>
	);
}

function Invite() {
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();

	return (
		<>
			<InviteUserTeamCard active={user?.isEmailVerified} onClick={openModal} />
			<InviteFormModal
				open={isOpen && !!user?.isEmailVerified}
				closeModal={closeModal}
			/>
		</>
	);
}
