import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { AppLayout } from '@components/layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import TaskDetailCard from '@components/shared/tasks/task-card';
import { withAuthentication } from 'lib/app/authenticator';
import { useAuthenticateUser, useTaskStatistics } from '@app/hooks';
import { Header } from '@components/pages/profile/header';
import {
	IProfileTabs,
	ProfileTabs,
} from '@components/pages/profile/profile-tabs';
import { Sidebar } from '@components/pages/settings/sidebar';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Button, Container,Text } from 'lib/components';
import { UserTeamCardHeader } from 'lib/features/team/user-team-card';
import { TeamMembers } from 'lib/features/team/team-members';
import {  UserGroupIcon, UserIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
// import UserIcon from '@components/ui/svgs/user-icon';
import LeftSideSettingMenu from '@components/pages/settings/left-side-setting-menu';

const Team = () => {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, tasks } = useTeamTasks();
	const { user: auth } = useAuthenticateUser();
	const { getAllTasksStatsData } = useTaskStatistics();
	const router = useRouter();
	const { memberId } = router.query;
	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => {
		return m.employee.userId === memberId;
	});
	const user =
		auth?.employee.id === memberId ? auth : currentUser?.employee.user;

	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={['Dashboard', 'Team Settings']} className="text-sm" />
				</Container>
			</div>

			<Container className="mb-10">
				<div className='flex w-full'>
					<LeftSideSettingMenu />
					<div className='bg-white dark:bg-dark--theme w-[903px] p-32 mt-36'>
						team
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(Team, { displayName: 'Team' });
