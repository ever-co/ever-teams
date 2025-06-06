'use client';
import React, { useEffect } from 'react';
import { useOrganizationTeams } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { IssuesView } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';

import { Analytics } from '@vercel/analytics/react';
import ChatwootWidget from '@/core/components/integration/chatwoot';

import 'react-loading-skeleton/dist/skeleton.css';
import '@/styles/globals.css';

import { useAtom } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { ChevronDown } from 'lucide-react';
import HeaderTabs from '@/core/components/common/header-tabs';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { usePathname } from 'next/navigation';
import { PeoplesIcon } from 'assets/svg';
import TeamMemberHeader from '@/core/components/teams/team-member-header';
import { TeamOutstandingNotifications } from '@/core/components/teams/team-outstanding-notifications';
import { TeamInvitations } from '@/core/components/teams/team-invitations';
import NoTeam from '@/core/components/common/no-team';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { UnverifiedEmail } from '@/core/components/common/unverified-email';
import { TeamMembers } from '@/core/components/pages/teams/team/team-members';
import { EverCard } from '@/core/components/common/ever-card';
import { Timer } from '@/core/components/timer/timer';
import { AuthUserTaskInput } from '@/core/components/auth/auth-user-task-input';

function MainPage() {
	const t = useTranslations();

	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();

	const [fullWidth, setFullWidth] = useAtom(fullWidthState);
	const [view, setView] = useAtom(headerTabs);
	const path = usePathname();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: t(`common.${view}`), href: `/` }
	];

	useEffect(() => {
		if (view == IssuesView.KANBAN && path == '/') {
			setView(IssuesView.CARDS);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [path, setView]);

	React.useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		window && window?.localStorage.getItem('conf-fullWidth-mode');
		setFullWidth(JSON.parse(window?.localStorage.getItem('conf-fullWidth-mode') || 'true'));
	}, [setFullWidth]);

	return (
		<>
			<div className="flex flex-col justify-between h-full min-h-screen">
				{/* <div className="flex-grow"> */}
				<MainLayout
					className="h-full"
					mainHeaderSlot={
						<div className="bg-white dark:bg-dark-high">
							<div className={clsxm('bg-white dark:bg-dark-high ', !fullWidth && 'x-container')}>
								<div className="mx-8-container my-3 !px-0 flex flex-row items-start justify-between ">
									<div className="flex items-center justify-center h-10 gap-8">
										<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />

										<Breadcrumb paths={breadcrumb} className="text-sm" />
									</div>

									<div className="flex items-center justify-center h-10 gap-1 w-max">
										<HeaderTabs linkAll={false} />
									</div>
								</div>

								<div className="mx-8-container">
									<div className="w-full">
										<UnverifiedEmail />

										<TeamInvitations className="!m-0" />

										<TeamOutstandingNotifications />
									</div>

									{isTeamMember ? <TaskTimerSection isTrackingEnabled={isTrackingEnabled} /> : null}
								</div>
								<TeamMemberHeader view={view} />
							</div>
						</div>
					}
					footerClassName={clsxm('')}
				>
					<ChatwootWidget />
					<div className="h-full">
						{isTeamMember ? (
							<Container fullWidth={fullWidth} className="mx-auto">
								<TeamMembers kanbanView={view} />
							</Container>
						) : (
							<NoTeam />
						)}
					</div>
				</MainLayout>
			</div>
			<Analytics />
		</>
	);
}

function TaskTimerSection({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const [showInput, setShowInput] = React.useState(false);
	return (
		<EverCard
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row gap-4 lg:gap-4 xl:gap-6 max-w-full flex-col-reverse justify-center md:justify-between items-center py-4 mb-2',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22] md:px-4'
			)}
		>
			<AuthUserTaskInput
				className={clsxm(
					'w-full lg:basis-3/4 grow max-w-[72%]',
					!showInput && '!hidden md:!flex',
					!isTrackingEnabled && 'md:w-full'
				)}
			/>
			<div
				onClick={() => setShowInput((p) => !p)}
				className="border dark:border-[#26272C] w-full rounded p-2 md:hidden flex justify-center mt-2"
			>
				<ChevronDown className={clsxm('h-12  transition-all', showInput && 'rotate-180')}>
					{showInput ? 'hide the issue input' : 'show the issue input'}
				</ChevronDown>
			</div>
			{isTrackingEnabled ? (
				<div className="w-full max-w-fit lg:basis-1/4 grow">
					<Timer />
				</div>
			) : null}
		</EverCard>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
