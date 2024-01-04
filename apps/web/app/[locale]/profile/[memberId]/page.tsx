'use client';

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
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { AppProps } from 'next/app';
import { MyAppProps } from '@app/interfaces/AppProps';
import { JitsuRoot } from 'lib/settings/JitsuRoot';

const Profile = ({ pageProps }: AppProps<MyAppProps>) => {
	const profile = useUserProfilePage();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();

	const hook = useTaskFilter(profile);

	const t = useTranslations();
	const breadcrumb = [{ title: activeTeam?.name || '', href: '/' }, ...JSON.parse(t('pages.profile.BREADCRUMB'))];

	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	return (
		<>
			<JitsuRoot pageProps={pageProps}>
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
						<div className="flex flex-col items-center justify-between py-5 md:py-10 md:flex-row">
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
			</JitsuRoot>
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
					` w-[100px] h-[100px]`, // removed the size variable from width and height, as passing variables is not supported by tailwind
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-7xl dark:text-6xl font-thin font-PlusJakartaSans ',
					!imageUrl && 'dark:border-[0.375rem] dark:border-[#26272C]'
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
					<>
						{imgTitle(userName).charAt(0)}
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="absolute -bottom-[0.625rem] dark:-bottom-[0.75rem] right-[10%] w-[1.875rem] h-[1.875rem] rounded-full"
						/>
					</>
				)}
			</div>

			<div className="flex flex-col gap-3.5">
				<Text.Heading as="h3" className="text-2xl md:text-4xl">
					{user?.firstName} {user?.lastName}
				</Text.Heading>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
