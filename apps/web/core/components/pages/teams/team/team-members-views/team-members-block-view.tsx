import * as React from 'react';
import { Transition } from '@headlessui/react';
import { useAtomValue } from 'jotai';
import { taskBlockFilterState } from '@/core/stores/tasks/task-filter';
import { UserTeamCardSkeleton } from './team-members-header';
import { useTranslations } from 'next-intl';
import { UserTeamBlock } from './user-team-block';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface Props {
	teamMembers: TOrganizationTeamEmployee[];
	publicTeam: boolean;
	currentUser: TOrganizationTeamEmployee | undefined;
	teamsFetching: boolean;
}

const TeamMembersBlockView: React.FC<Props> = React.memo(
	({ teamMembers: members, publicTeam = false, currentUser, teamsFetching }) => {
		const activeFilter = useAtomValue(taskBlockFilterState);

		let emptyMessage = '';
		const t = useTranslations();

		switch (activeFilter) {
			case 'online':
				emptyMessage = t('common.NO_USERS_ONLINE');
				break;
			case 'running':
				emptyMessage = t('common.NO_USERS_WORKING');
				break;
			case 'pause':
				emptyMessage = t('common.NO_USERS_PAUSED_WORK');
				break;
			case 'idle':
				emptyMessage = t('common.NO_USERS_IDLE');
				break;
		}

		return (
			<>
				<div className="mt-7">
					{/* Current authenticated user members */}
					<Transition
						as="div"
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
					<div className="flex flex-wrap items-center w-full">
						{members.map((member) => {
							return (
								<div className="p-1 w-full md:w-1/2 lg:w-1/4" key={member.id}>
									<Transition
										as="div"
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
					<Transition
						as="div"
						show={teamsFetching}
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
					</Transition>
					{members.length < 1 && !teamsFetching && (
						<div className="flex justify-center items-center py-16">
							<p className="text-lg">{emptyMessage}</p>
						</div>
					)}
				</div>
			</>
		);
	}
);

export default TeamMembersBlockView;
