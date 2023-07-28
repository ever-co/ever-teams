import { useOrganizationTeams, useUserProfilePage } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
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
import { useMemo } from 'react';

const Profile = () => {
	const profile = useUserProfilePage();
	const { isTrackingEnabled } = useOrganizationTeams();

	const hook = useTaskFilter(profile);

	const { trans } = useTranslation('profile');

	const profileIsAuthUser = useMemo(
		() => profile.isAuthUser,
		[profile.isAuthUser]
	);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	return (
		<>
			<MainLayout showTimer={!profileIsAuthUser && isTrackingEnabled}>
				<MainHeader className={clsxm(hookFilterType && ['pb-0'])}>
					{/* Breadcrumb */}
					<div className="flex items-center space-x-3">
						<Link href="/">
							<ArrowLeft />
						</Link>

						<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
					</div>

					{/* User Profile Detail */}
					<div className="flex items-center justify-between py-10 xs:flex-row flex-col">
						<UserProfileDetail member={profile.member} />

						{profileIsAuthUser && isTrackingEnabled && (
							<Timer
								className={clsxm(
									'p-5 rounded-lg shadow-xlcard',
									'dark:border-[2px] dark:border-[#28292F]'
								)}
							/>
						)}
					</div>

					{/* TaskFilter */}
					<TaskFilter profile={profile} hook={hook} />
				</MainHeader>

				<Container className="mb-10">
					<UserProfileTask profile={profile} tabFiltered={hook} />
				</Container>
			</MainLayout>
		</>
	);
};

function UserProfileDetail({ member }: { member?: OT_Member }) {
	const user = useMemo(() => member?.employee.user, [member?.employee.user]);
	const imgUrl =
		user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const timerStatus = useMemo(
		() => member?.timerStatus || 'idle',
		[member?.timerStatus]
	);

	return (
		<div className="flex items-center space-x-4 mb-4 md:mb-0">
			<Avatar size={80} imageUrl={imageUrl}>
				<TimerStatus
					status={timerStatus}
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
