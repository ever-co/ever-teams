// import { useState } from 'react';
import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container,Text } from 'lib/components';
import LeftSideSettingMenu from '@components/pages/settings/left-side-setting-menu';
import ProfileAvatar from '@components/pages/settings/profile-avatar';
import PersonalSettingForm from '@components/pages/settings/personal-setting-form';
import DangerZone from '@components/pages/settings/danger-zone';

const Personal = () => {
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
						<Text className='text-4xl font-PlusJakartaSansSemiBold'>Personal Settings</Text>
						<Text className='text-base font-PlusJakartaSansLight'>Setting dan manage your personal dashboard here</Text>
						<ProfileAvatar />
						<PersonalSettingForm />
					</Card>
					<Card className='dark:bg-dark--theme p-[32px] mt-[36px]' shadow='bigger'>
						<Text className='text-2xl text-[#EB6961] font-PlusJakartaSansSemiBold'>Danger Zone</Text>
						<DangerZone />
					</Card>
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(Personal, { displayName: 'Personal' });
