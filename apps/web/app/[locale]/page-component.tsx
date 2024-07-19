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

import { useRecoilState } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { ChevronDown } from 'lucide-react';
import HeaderTabs from '@components/pages/main/header-tabs';
import { headerTabs } from '@app/stores/header-tabs';
import { usePathname } from 'next/navigation';
import { PeoplesIcon } from 'assets/svg';
import TeamMemberHeader from 'lib/features/team-member-header';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import { TeamOutstandingNotifications } from 'lib/features/team/team-outstanding-notifications';
import { DailyPlanCompareEstimatedModal } from 'lib/features/daily-plan';

function MainPage() {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(true)

	const [headerSize, setHeaderSize] = useState(10);

	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const [fullWidth, setFullWidth] = useRecoilState(fullWidthState);
	const [view, setView] = useRecoilState(headerTabs);
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
	}, [fullWidth, setFullWidth]);

	if (!online) {
		return <Offline />;
	}
	return (
		<>
			<DailyPlanCompareEstimatedModal open={isOpen} closeModal={() => setIsOpen(prev => prev)} />

			<div className="flex flex-col h-screen justify-between">
				{/* <div className="flex-grow "> */}
				<MainLayout className="h-full" footerClassName={clsxm('')}>
					<ChatwootWidget />
					<div className=" h-full">
						<ResizablePanelGroup direction="vertical">
							{/* <Container className="mx-0 " fullWidth={fullWidth}> */}
							<ResizablePanel
								defaultSize={30}
								maxSize={48}
								className={clsxm(
									headerSize < 20 ? '!overflow-hidden ' : '!overflow-visible',
									'dark:bg-dark-high border-b-[0.125rem] dark:border-[#26272C]'
								)}
								onResize={(size) => setHeaderSize(size)}
							>
								<div className="bg-white sticky z-50 dark:bg-dark-high">
									<div className={clsxm('bg-white dark:bg-dark-high ', !fullWidth && 'x-container')}>
										<div className="mx-8-container pt-9 !px-0 flex flex-row items-start justify-between ">
											<div className="flex justify-center items-center gap-8 h-10">
												<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
												<Breadcrumb paths={breadcrumb} className="text-sm" />
											</div>
											<div className="flex h-10 w-max items-center justify-center  gap-1">
												<HeaderTabs linkAll={false} />
											</div>
										</div>
										<div className="mx-8-container mb-1">
											<UnverifiedEmail />
											<TeamInvitations />
											<TeamOutstandingNotifications />
											{isTeamMember ? (
												<TaskTimerSection isTrackingEnabled={isTrackingEnabled} />
											) : null}
										</div>
										<TeamMemberHeader view={view} />
									</div>
								</div>
							</ResizablePanel>
							<ResizableHandle withHandle />
							{/* </Container> */}
							<ResizablePanel
								defaultSize={65}
								maxSize={95}
								className="!overflow-y-scroll custom-scrollbar"
							>
								<div>{isTeamMember ? <TeamMembers kanbanView={view} /> : <NoTeam />}</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					</div>
				</MainLayout>
			</div>
			<Analytics />
		</>
	);
}

function TaskTimerSection({ isTrackingEnabled }: { isTrackingEnabled: boolean }) {
	const [showInput, setShowInput] = React.useState(false);
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row flex-col-reverse justify-center md:justify-between items-center py-4',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			<AuthUserTaskInput
				className={clsxm(
					'mx-auto w-full lg:w-3/4 lg:mr-10',
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
				<div className="w-full lg:w-1/4">
					<Timer />
				</div>
			) : null}
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
