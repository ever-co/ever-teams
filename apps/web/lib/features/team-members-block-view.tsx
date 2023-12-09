import * as React from 'react';
import { OT_Member } from '@app/interfaces';
import { Transition } from '@headlessui/react';
import { UserTeamBlock } from './team/user-team-block';
import { useRecoilValue } from 'recoil';
import { taskBlockFilterState } from '@app/stores/task-filter';

interface Props {
	teamMembers: OT_Member[];
	publicTeam: boolean;
	currentUser: OT_Member | undefined;
	teamsFetching: boolean;
}

const TeamMembersBlockView: React.FC<Props> = ({ teamMembers: members, publicTeam = false, currentUser }) => {
	const activeFilter = useRecoilValue(taskBlockFilterState);

	let emptyMessage = '';

	switch (activeFilter) {
		case 'online':
			emptyMessage = 'There are no users online.';
			break;
		case 'running':
			emptyMessage = 'No users are currently working.';
			break;
		case 'pause':
			emptyMessage = 'No users are paused work at the moment.';
			break;
		case 'idle':
			emptyMessage = 'No users are idle right now.';
			break;
	}

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
			{members.length < 1 && (
				<div className="py-16 flex justify-center items-center">
					<p className="text-lg">{emptyMessage}</p>
				</div>
			)}
		</div>
	);
};

export default TeamMembersBlockView;
