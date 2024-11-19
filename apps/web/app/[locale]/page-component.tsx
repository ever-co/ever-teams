/* eslint-disable no-mixed-spaces-and-tabs */

'use client';
import React, { useEffect, useState } from 'react';
import { useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import NoTeam from '@components/pages/main/no-team';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card } from 'lib/components';
import { AuthUserTaskInput, TeamInvitations, TeamMembers, Timer, UnverifiedEmail } from 'lib/features';
import { MainLayout } from 'lib/layout';
import { IssuesView } from '@app/constants';
import { useNetworkState } from '@uidotdev/usehooks';
import Offline from '@components/pages/offline';
import { useTranslations } from 'next-intl';

import { Analytics } from '@vercel/analytics/react';
import ChatwootWidget from 'lib/features/integrations/chatwoot';

import 'react-loading-skeleton/dist/skeleton.css';
import '../../styles/globals.css';

import { useAtom } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { ChevronDown } from 'lucide-react';
import HeaderTabs from '@components/pages/main/header-tabs';
import { headerTabs } from '@app/stores/header-tabs';
import { usePathname } from 'next/navigation';
import { PeoplesIcon } from 'assets/svg';
import TeamMemberHeader from 'lib/features/team-member-header';
import { TeamOutstandingNotifications } from 'lib/features/team/team-outstanding-notifications';

function MainPage() {
	const t = useTranslations();
	const [headerSize] = useState(10);
	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const [fullWidth, setFullWidth] = useAtom(fullWidthState);
	const [view, setView] = useAtom(headerTabs);
	const path = usePathname();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: t(`common.${view}`), href: `/` }
	];
	const { online } = useNetworkState();
	useEffect(() => {
		if (view == IssuesView.KANBAN && path == '/') {
			setView(IssuesView.CARDS);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [path, setView]);

	React.useEffect(() => {
		window && window?.localStorage.getItem('conf-fullWidth-mode');
		setFullWidth(JSON.parse(window?.localStorage.getItem('conf-fullWidth-mode') || 'true'));
	}, [setFullWidth]);

	if (!online) {
		return <Offline />;
	}
	return (
		<>
			<div className="flex flex-col justify-between h-full min-h-screen">
				{/* <div className="flex-grow "> */}
				<MainLayout
					showTimer={headerSize <= 11.8 && isTrackingEnabled}
					className="h-full"
					mainHeaderSlot={
						<div className="sticky z-40 bg-white dark:bg-dark-high">
							<div className={clsxm('bg-white dark:bg-dark-high ', !fullWidth && 'x-container')}>
								<div className="mx-8-container pt-6 !px-0 flex flex-row items-start justify-between ">
									<div className="flex items-center justify-center h-10 gap-8">
										<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />

										<Breadcrumb paths={breadcrumb} className="text-sm" />
									</div>

									<div className="flex items-center justify-center h-10 gap-1 w-max">
										<HeaderTabs linkAll={false} />
									</div>
								</div>

								<div className="mb-1 mx-8-container">
									<div className="w-full mt-3">
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
					<div className="h-full ">{isTeamMember ? <TeamMembers kanbanView={view} /> : <NoTeam />}</div>
				</MainLayout>
			</div>
			<Analytics />
		</>
	);
}

function TaskTimerSection({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const [showInput, setShowInput] = React.useState(false);
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row gap-4 lg:gap-5 xl:gap-8 max-w-full flex-col-reverse justify-center md:justify-between items-center py-4',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			<AuthUserTaskInput
				className={clsxm(
					'w-full lg:basis-3/4 grow',
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
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
