import * as React from 'react';
import { OT_Member } from '@app/interfaces';
import { Transition } from '@headlessui/react';
import { UserTeamCard } from './team/user-team-block';

interface Props {
	teamMembers: OT_Member[];
	publicTeam: boolean;
	currentUser: OT_Member | undefined;
	teamsFetching: boolean;
}

const TeamMembersBlockView: React.FC<Props> = ({
	teamMembers: members,
	publicTeam = false,
	currentUser,
	teamsFetching = false
}) => {
	console.log(publicTeam, currentUser, teamsFetching);
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
				{/* <li className="mb-4">authenticated  user task card  here</li> */}
			</Transition>
			<div className="flex w-full items-center">
				{members.map((member) => {
					return (
						<div className="p-1 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" key={member.id}>
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
								<UserTeamCard member={member} publicTeam={publicTeam} />
							</Transition>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TeamMembersBlockView;
