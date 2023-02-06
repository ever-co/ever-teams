import { useUserProfilePage } from '@app/hooks';
import { IUser } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Avatar, Breadcrumb, Container, Text } from 'lib/components';
import { ArrowLeft } from 'lib/components/svgs';
import {
	TaskFilter,
	Timer,
	TimerStatus,
	UserProfileTask,
	useTaskFilter,
} from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';
import Link from 'next/link';

const Profile = () => {
	const profile = useUserProfilePage();

	const hook = useTaskFilter(profile);

	const { trans } = useTranslation('profile');

	return (
		<MainLayout showTimer={!profile.isAuthUser}>
			<MainHeader>
				{/* Breadcrumb */}
				<div className="flex space-x-5 items-center">
					<Link href="/">
						<ArrowLeft />
					</Link>

					<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
				</div>

				{/* User Profil Detail */}
				<div className="flex justify-between items-center py-10">
					<UserProfilDetail user={profile.userProfile} />

					{profile.isAuthUser && (
						<Timer
							className={clsxm(
								'p-5 rounded-lg shadow-xlcard',
								'dark:border-[2px] dark:border-[#28292F] '
							)}
						/>
					)}
				</div>

				{/* TaskFilter */}
				<TaskFilter hook={hook} />
			</MainHeader>

			<Container className="mb-10">
				<UserProfileTask profile={profile} tabFiltered={hook} />
			</Container>
		</MainLayout>
	);
};

function UserProfilDetail({ user }: { user?: IUser }) {
	return (
		<div className="flex items-center space-x-4">
			<Avatar size={80} imageUrl={user?.imageUrl}>
				<TimerStatus
					status={'running'}
					className="absolute border z-20 bottom-3 right-[12%] -mb-3"
				/>
			</Avatar>

			<div>
				<Text.Heading as="h3" className="text-2xl">
					{user?.firstName} {user?.lastName}
				</Text.Heading>
				<Text className="text-xs text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
