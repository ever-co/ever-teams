/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@app/helpers';
import { useOrganizationTeams, useTimer, useUserProfilePage } from '@app/hooks';
import { ITimerStatusEnum, OT_Member } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import clsx from 'clsx';
import { withAuthentication } from 'lib/app/authenticator';
import { Avatar, Breadcrumb, Container, Text } from 'lib/components';
import { ArrowLeft } from 'lib/components/svgs';
import { TaskFilter, Timer, TimerStatus, UserProfileTask, getTimerStatusValue, useTaskFilter } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useMemo } from 'react';
import stc from 'string-to-color';

const Profile = () => {
	const profile = useUserProfilePage();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();

	const hook = useTaskFilter(profile);

	const { t } = useTranslation();
	const breadcrumb = [
		{ title: activeTeam?.name || '', href: '/' },
		...t('pages.profile.BREADCRUMB', { returnObjects: true })
	];

	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	return (
		<>
			<MainLayout showTimer={!profileIsAuthUser && isTrackingEnabled}>
				<MainHeader className={clsxm(hookFilterType && ['pb-0'], 'pb-2', 'pt-20')}>
					{/* Breadcrumb */}
					<div className="flex items-center gap-8">
						<Link href="/">
							<ArrowLeft className="w-6 h-6" />
						</Link>

						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</div>

					{/* User Profile Detail */}
					<div className="flex flex-col items-center justify-between py-10 xs:flex-row">
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
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 100;
	const { timerStatus } = useTimer();
	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, false);
	}, [timerStatus, member]);

	return (
		<div className="flex items-center mb-4 space-x-4 md:mb-0">
			<div
				className={clsx(
					`w-[${size}px] h-[${size}px]`,
					'flex justify-center items-center',
					'rounded-full text-xs text-default dark:text-white',
					'shadow-md text-4xl font-normal'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`
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
							status={timerStatusValue}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="mt-24 dark:mt-20 mr-3"
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

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
	const { locale } = context;
	const translateProps = await serverSideTranslations(locale ?? 'en', ['common']);
	return {
		props: {
			...translateProps
		}
	};
};

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
