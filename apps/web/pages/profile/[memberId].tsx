import { imgTitle } from '@app/helpers';
import { useOrganizationTeams, useUserProfilePage } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import clsx from 'clsx';
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
import stc from 'string-to-color';

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
				<MainHeader
					className={clsxm(hookFilterType && ['pb-0'], 'pb-2', 'pt-20')}
				>
					{/* Breadcrumb */}
					<div className="flex items-center gap-8">
						<Link href="/">
							<ArrowLeft className="h-6 w-6" />
						</Link>

						<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
					</div>

					{/* User Profile Detail */}
					<div className="flex items-center justify-between py-10 xs:flex-row flex-col">
						<UserProfileDetail member={profile.member} />

						{profileIsAuthUser && isTrackingEnabled && (
							<Timer
								className={clsxm(
									'p-5 rounded-2xl shadow-xlcard',
									'dark:border-[0.125rem] dark:border-[#28292F]',
									'dark:bg-[#1B1D22]'
								)}
							/>
						)}
					</div>

					{/* TaskFilter */}
					<TaskFilter profile={profile} hook={hook} />
				</MainHeader>
				{/* Divider */}
				<div className="h-0.5 bg-[#FFFFFF14]"></div>

				<Container className="mb-10">
					<UserProfileTask profile={profile} tabFiltered={hook} />
				</Container>
			</MainLayout>
		</>
	);
};

function UserProfileDetail({ member }: { member?: OT_Member }) {
	const user = useMemo(() => member?.employee.user, [member?.employee.user]);
	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl =
		user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const timerStatus = useMemo(
		() => member?.timerStatus || 'idle',
		[member?.timerStatus]
	);
	const size = 100;

	return (
		<div className="flex items-center space-x-4 mb-4 md:mb-0">
			<div
				className={clsx(
					`w-[${size}px] h-[${size}px]`,
					'flex justify-center items-center',
					'rounded-full text-xs text-default dark:text-white',
					'shadow-md text-4xl font-normal'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`,
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={size}
						className="relative dark:border-[0.375rem] dark:border-[#26272C]"
						imageUrl={imageUrl}
						alt={userName}
						imageTitle={userName.charAt(0)}
					>
						<TimerStatus
							status={timerStatus}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-[#26272C]"
						/>
					</Avatar>
				) : (
					imgTitle(userName).charAt(0)
				)}
			</div>

			<div className="flex flex-col gap-3.5">
				<Text.Heading as="h3" className="text-4xl">
					{user?.firstName} {user?.lastName}
				</Text.Heading>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
