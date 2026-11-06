import InviteCard from '@/core/components/teams/invite/invite-card';
import { InvitedCard } from '@/core/components/teams/invite/invited-card';
import UsersCard from '@/core/components/teams/members-card/members-card';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useOrganizationTeamsQuery } from '@/core/hooks/organizations';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';

export const TeamMemberSection = () => {
	const { isTeamManager, user } = useAuthenticateUser();

	const activeTeam = useAtomValue(activeTeamState);
	const { getOrganizationTeamsLoading } = useOrganizationTeamsQuery();
	const { teamInvitations } = useTeamInvitationsQuery();
	const members = activeTeam?.members || [];
	// const style = { width: `${100 / members.length}%` };

	const $teamsFetching = getOrganizationTeamsLoading && members.length === 0;

	const currentUser = members.find((m) => {
		return m.employee?.userId === user?.id;
	});

	const $members = members.filter((m) => {
		return m.employee?.userId !== user?.id;
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
								className="mt-3 animate-pulse hairline-divide-y divide-border rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5 md:p-6"
							>
								<div className="flex justify-between items-center">
									<div className="flex items-center space-x-3">
										<div className="w-5 h-5 mr-8 rounded-full bg-foreground/5"></div>
										<div className="w-14 h-14 rounded-full bg-foreground/5"></div>
										<div>
											<div className="mb-2 w-32 h-3 rounded-md bg-foreground/5"></div>
										</div>
									</div>
									<div className="h-2.5 rounded-md bg-foreground/5 w-24" />
									<div className="h-2.5 rounded-md bg-foreground/5 w-24" />
									<div className="h-2.5 rounded-md bg-foreground/5 w-24" />
									<div className="h-2.5 rounded-md bg-foreground/5 w-24" />
								</div>
							</li>
						);
					})}

				{$teamsFetching && (
					<li
						role="status"
						className="mt-3 animate-pulse hairline-divide-y divide-border rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5 md:p-6"
					>
						<div className="flex justify-between items-center">
							<div className="flex items-center space-x-3">
								<div className="w-5 h-5 mr-8 rounded-full bg-foreground/5"></div>
								<div className="w-24 h-9 rounded-md bg-foreground/5"></div>
							</div>
						</div>
					</li>
				)}
			</ul>
		</div>
	);
};

const Header = () => {
	const t = useTranslations();

	return (
		<li>
			<div className="flex items-center justify-between text-primary font-semibold ">
				<div className="w-[60px]  text-center">{t('task.taskTableHead.TASK_STATUS')}</div>
				<div className="w-[215px]  text-center">{t('task.taskTableHead.TASK_NAME')}</div>
				<div></div>
				<div className="w-[334px]  text-center">{t('task.TITLE')}</div>
				<div></div>
				<div className="w-[122px]  text-center">{t('task.taskTableHead.TASK_WORK.LABEL')}</div>
				<div></div>
				<div className="w-[245px]  text-center">{t('task.taskTableHead.TASK_TIME')}</div>
				<div></div>
				<div className="w-[184px]  text-center flex items-center justify-center">
					<span className="w-[104px]">{t('task.taskTableHead.TOTAL_WORK.LABEL')}</span>
				</div>
			</div>
		</li>
	);
};
