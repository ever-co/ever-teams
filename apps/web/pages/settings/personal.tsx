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
import { Breadcrumb, Button, Container,Text, ThemeToggler } from 'lib/components';
import { UserGroupIcon, UserIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import LeftSideSettingMenu from '@components/pages/settings/LeftSideSettingMenu';

const Personal = () => {
	const router = useRouter();
	const [activePage,setActivePage] = useState('personal');
	console.log(router)	

	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={['Dashboard', 'Personal Settings']} className="text-sm" />
					{/* <TaskTimerSection /> */}

					{/* Header user card list */}
					{/* <UserTeamCardHeader /> */}
				</Container>
			</div>

			<Container className="mb-10">
				<div className='flex w-full'>
					{/* <div className='w-[320px] mt-[36px] mr-[56px]'>
						<Text className='text-4xl font-PlusJakartaSansSemiBold mb-[40px]'>Settings</Text>
						<Link href="/settings/personal">
							<Button variant="outline" className={`w-full border-t-0 border-r-0 border-b-0 rounded-none
						font-normal justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
						${activePage === 'personal' ? ' border-l-[5px] border-l-solid border-l-primary bg-primary/5' : 'border-l-0'}`}>
								<UserIcon className="w-[16px] h-[16px]" /> Personal
							</Button>
						</Link>
						<Link href="/settings/team">
							<Button variant="outline" className={`w-full border-t-0 border-r-0 border-b-0 rounded-none
							font-normal  justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
							${activePage === 'team' ? ' border-l-[5px] border-l-solid border-l-primary bg-primary/5' : 'border-l-0'}`}>
								<UserGroupIcon className="w-[16px] h-[16px]" /> Team
							</Button>
						</Link>
					</div> */}
					<LeftSideSettingMenu />
					<div className='bg-white dark:bg-dark--theme w-full p-[32px] mt-[36px]'>
						<Text >Personal Settings</Text>
						<Text>Setting dan manage your personal dashboard here</Text>
						<ThemeToggler />
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(Personal, { displayName: 'Personal' });
