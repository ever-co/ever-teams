import UsersCard from '@components/shared/members-card/members-card';
import InviteCard from '@components/shared/invite/invite-card';
import { useAuthenticateUser } from '@app/hooks';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { useTeamInvitations } from '@app/hooks/features/useTeamInvitations';
import { InvitedCard } from '@components/shared/invite/invited-card';

const TeamMemberSection = () => {
	const { isTeamManager, user } = useAuthenticateUser();
	const { activeTeam, teamsFetching } = useOrganizationTeams();
	const { teamInvitations } = useTeamInvitations();
	const members = activeTeam?.members || [];
	// const style = { width: `${100 / members.length}%` };

	const $teamsFetching = teamsFetching && members.length === 0;

	const currentUser = members.find((m) => {
		return m.employee.userId === user?.id;
	});

	const $members = members.filter((m) => {
		return m.employee.userId !== user?.id;
	});

	return (
		<div className="mt-[42px]">
			<ul className="w-full">
				<Header />
				{currentUser && (
					<li key={currentUser.id}>
						<UsersCard member={currentUser} />
					</li>
				)}
				{$members.map((member) => (
					<li key={member.id}>
						<UsersCard member={member} />
					</li>
				))}

				{members.length > 0 &&
					teamInvitations.map((invitation) => (
						<li key={invitation.id}>
							<InvitedCard invitation={invitation} />
						</li>
					))}

				{isTeamManager && (
					<li>
						<InviteCard />
					</li>
				)}

				{$teamsFetching &&
					[1, 2].map((_, i) => {
						return (
							<li
								key={i}
								role="status"
								className="p-4 mt-3 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
							>
								<div className="flex justify-between items-center">
									<div className="flex items-center space-x-3">
										<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
										<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
										<div>
											<div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></div>
										</div>
									</div>
									<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
									<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
									<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
									<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-24"></div>
								</div>
							</li>
						);
					})}

				{$teamsFetching && (
					<li
						role="status"
						className="p-4 mt-3 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
					>
						<div className="flex justify-between items-center">
							<div className="flex items-center space-x-3">
								<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
								<div className="w-24 h-9 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
							</div>
						</div>
					</li>
				)}
			</ul>
		</div>
	);
};

const Header = () => {
	return (
		<li>
			<div className="flex items-center justify-between text-primary font-bold dark:text-[#FFFFFF]">
				<div className="w-[60px]  text-center">Status</div>
				<div className="w-[215px]  text-center">Name</div>
				<div></div>
				<div className="w-[334px]  text-center">Task</div>
				<div></div>
				<div className="w-[122px]  text-center">Worked on task</div>
				<div></div>
				<div className="w-[245px]  text-center">Estimate</div>
				<div></div>
				<div className="w-[184px]  text-center flex items-center justify-center">
					<span className="w-[104px]">Total worked Today</span>
				</div>
			</div>
		</li>
	);
};
export default TeamMemberSection;
