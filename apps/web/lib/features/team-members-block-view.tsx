import * as React from 'react';
import { OT_Member } from '@app/interfaces';
import { Transition } from '@headlessui/react';
import { UserTeamBlock } from './team/user-team-block';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';

interface Props {
	teamMembers: OT_Member[];
	publicTeam: boolean;
	currentUser: OT_Member | undefined;
	teamsFetching: boolean;
}

const TeamMembersBlockView: React.FC<Props> = ({ teamMembers: members, publicTeam = false, currentUser }) => {
	return (
		<div className="mt-7">
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
				{/* <UserTeamBlock member={currentUser} publicTeam={publicTeam} /> */}
			</Transition>
			<div className="flex w-full flex-wrap items-center">
				{members.map((member) => {
					return (
						<div className="p-1 w-full md:w-1/2  lg:w-1/4" key={member.id}>
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
								<UserTeamBlock member={member} publicTeam={publicTeam} />
							</Transition>
						</div>
					);
				})}
			</div>
			<div>
				<Transition
					show={members.length < 1}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					{new Array(3).fill(0).map((_, i) => {
						return (
							<div key={i} className="mt-3">
								<UserTeamCardSkeletonCard />
							</div>
						);
					})}
				</Transition>
			</div>
		</div>
	);
};

export default TeamMembersBlockView;
