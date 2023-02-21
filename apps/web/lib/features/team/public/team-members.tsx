import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { Transition } from '@headlessui/react';

import {
	InviteUserTeamSkeleton,
	PublicUserTeamCard,
	PublicUserTeamCardSkeleton,
} from '../../';

export function PublicTeamMembers() {
	const { user } = useAuthenticateUser();
	const { activeTeam, teamsFetching } = useOrganizationTeams();

	const members = activeTeam?.members || [];
	const $teamsFetching = teamsFetching && members.length === 0;

	const currentUser = members.find((m) => {
		return m.employee.userId === user?.id;
	});

	const $members = members.filter((m) => {
		return m.employee.user?.id !== user?.id;
	});

	return (
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
					<PublicUserTeamCard member={currentUser} active />
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
							<PublicUserTeamCard member={member} />
						</li>
					</Transition>
				);
			})}

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
							<PublicUserTeamCardSkeleton />
						</li>
					);
				})}
				<li>
					<InviteUserTeamSkeleton />
				</li>
			</Transition>
		</ul>
	);
}
