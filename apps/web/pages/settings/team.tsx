import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container,Text } from 'lib/components';
import LeftSideSettingMenu from '@components/pages/settings/left-side-setting-menu';
import ProfileAvatar from '@components/pages/settings/profile-avatar';
import TeamSettingForm from '@components/pages/settings/team-setting-form';
import TaskStatusesForm from '@components/pages/settings/task-statuses-form';
import TaskPrioritiesForm from '@components/pages/settings/task-priorities-form';
import TaskSizesForm from '@components/pages/settings/task-sizes-form';
import TaskLabelsForm from '@components/pages/settings/task-labels-form';
import DangerZoneTeam from '@components/pages/settings/danger-zone-team';

const Team = () => {
	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={['Dashboard', 'Settings']} className="text-sm" />
				</Container>
			</div>

			<Container className="mb-10">
				<div className='flex w-full'>
					<LeftSideSettingMenu />
					<div className='flex flex-col w-full'>
					<Card className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
						<Text className='text-4xl font-medium'>Team Settings</Text>
						<Text className='text-base font-normal text-gray-400'>Setting dan manage your personal dashboard here</Text>
						<ProfileAvatar />
						<TeamSettingForm />
					</Card>
					<Card className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0" shadow="bigger">
						<TaskStatusesForm />
					</Card>
					<Card className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0" shadow="bigger">
						<TaskPrioritiesForm />
					</Card>
					<Card className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0" shadow="bigger">
						<TaskSizesForm />
					</Card>
					<Card className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0" shadow="bigger">
						<TaskLabelsForm />
					</Card>
					<Card className='dark:bg-dark--theme p-[32px] mt-[36px]' shadow='bigger'>
						<Text className='text-2xl text-[#EB6961] font-normal'>Danger Zone</Text>
						<DangerZoneTeam />
					</Card>
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(Team, { displayName: 'Team' });
