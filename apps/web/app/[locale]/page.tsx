/* eslint-disable no-mixed-spaces-and-tabs */

'use client';

import React from 'react';
import { useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import NoTeam from '@components/pages/main/no-team';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container, Tooltip } from 'lib/components';
import { PeopleIcon } from 'lib/components/svgs';
import {
	AuthUserTaskInput,
	TeamInvitations,
	TeamMembers,
	Timer,
	UnverifiedEmail,
	UserTeamCardHeader,
	UserTeamBlockHeader
} from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { useState } from 'react';
import { IssuesView } from '@app/constants';
import { TableCellsIcon, QueueListIcon, Squares2X2Icon } from '@heroicons/react/24/solid';
import { useNetworkState } from '@uidotdev/usehooks';
import KanbanIcon from '@components/ui/svgs/kanaban';
import Offline from '@components/pages/offline';
import UserTeamTableHeader from 'lib/features/team/user-team-table/user-team-table-header';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { setNextPublicEnv } from '@app/env';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { Analytics } from '@vercel/analytics/react';
import type { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import ChatwootWidget from 'lib/features/integrations/chatwoot';
import type { AppProps } from 'next/app';
import { JitsuAnalytics } from '../../lib/components/services/jitsu-analytics';
import 'react-loading-skeleton/dist/skeleton.css';
import '../../styles/globals.css';

type MyAppProps = {
	jitsuConf?: JitsuOptions;
	jitsuHost?: string;
	envs: Record<string, string>;
	user?: any;
};

function MainPage({ pageProps }: AppProps<MyAppProps>) {
	const t = useTranslations();
	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();

	const breadcrumb = [...JSON.parse(t('pages.home.BREADCRUMB')), activeTeam?.name || ''];
	const [view, setView] = useState<IssuesView>(IssuesView.CARDS);
	const { online } = useNetworkState();

	if (!online) {
		return <Offline />;
	}

	setNextPublicEnv(pageProps.envs);

	const jitsuConf = pageProps?.jitsuConf;
	console.log(`Jitsu Configuration: ${JSON.stringify(jitsuConf)}`);

	const isJitsuEnvsPresent: boolean = jitsuConf?.host !== '' && jitsuConf?.writeKey !== '';
	console.log(`Jitsu Enabled: ${isJitsuEnvsPresent}`);

	return (
		<>
			<JitsuProvider
				options={
					isJitsuEnvsPresent
						? {
								host: jitsuConf?.host ?? '',
								writeKey: jitsuConf?.writeKey ?? undefined,
								debug: jitsuConf?.debug,
								cookieDomain: jitsuConf?.cookieDomain ?? undefined,
								echoEvents: jitsuConf?.echoEvents
						  }
						: {
								disabled: true
						  }
				}
			>
				<MainLayout>
					<JitsuAnalytics user={pageProps?.user} />
					<ChatwootWidget />
					<MainHeader className="pb-1">
						<div className="flex flex-col md:flex-row items-start justify-between h-12 md:h-5">
							<div className="flex  items-center gap-8">
								<PeopleIcon className="stroke-dark dark:stroke-[#6b7280] h-6 w-6" />
								<Breadcrumb paths={breadcrumb} className="text-sm" />
							</div>

							{/* <Collaborative /> */}
							<div className="flex w-full md:w-max items-center justify-center py-4 md:py-0 gap-1">
								<Tooltip label={'Cards'} placement="top-start">
									<button
										className={clsxm(
											'rounded-md px-3 py-1 text-sm font-medium',
											view === IssuesView.CARDS
												? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
												: 'text-gray-700 dark:text-gray-300'
										)}
										onClick={() => setView(IssuesView.CARDS)}
									>
										<QueueListIcon className="w-5 h-5 inline" />
									</button>
								</Tooltip>
								<Tooltip label={'Table'} placement="top-start">
									<button
										className={clsxm(
											'rounded-md px-3 py-1 text-sm font-medium',
											view === IssuesView.TABLE
												? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
												: 'text-gray-700 dark:text-gray-300'
										)}
										onClick={() => setView(IssuesView.TABLE)}
									>
										<TableCellsIcon className="w-5 h-5 inline" />
									</button>
								</Tooltip>
								<Tooltip label={'Blocks'} placement="top-start">
									<button
										className={clsxm(
											'rounded-md px-3 py-1 text-sm font-medium',
											view === IssuesView.BLOCKS
												? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
												: 'text-gray-700 dark:text-gray-300'
										)}
										onClick={() => setView(IssuesView.BLOCKS)}
									>
										<Squares2X2Icon className="w-5 h-5 inline" />
									</button>
								</Tooltip>
								<Tooltip label={'Kanban'} placement="top-start">
									<Link
										href={'/en/kanban'}
										className={clsxm(
											'rounded-md px-3 py-1 text-sm font-medium',
											view === IssuesView.KANBAN
												? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
												: 'text-gray-700 dark:text-gray-300'
										)}
									>
										<KanbanIcon />
									</Link>
								</Tooltip>
							</div>
						</div>

						<UnverifiedEmail />
						<TeamInvitations />
					</MainHeader>

					<div
						className={`sticky top-20 z-50 bg-white dark:bg-[#191A20] pt-5 ${
							view !== IssuesView.CARDS ? 'pb-7' : ''
						}`}
					>
						<Container>
							{isTeamMember ? <TaskTimerSection isTrackingEnabled={isTrackingEnabled} /> : null}
							{/* Header user card list */}
							{view === IssuesView.CARDS && isTeamMember ? (
								<UserTeamCardHeader />
							) : view === IssuesView.BLOCKS ? (
								<UserTeamBlockHeader />
							) : view === IssuesView.TABLE ? (
								<UserTeamTableHeader />
							) : null}
						</Container>

						{/* Divider */}
						<div className="h-0.5 bg-[#FFFFFF14]"></div>
					</div>

					<Container className="">{isTeamMember ? <TeamMembers kanbanView={view} /> : <NoTeam />}</Container>
				</MainLayout>
			</JitsuProvider>
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
				'w-full flex md:flex-row flex-col-reverse justify-center md:justify-between items-center py-4',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			{/* {showInput && ( */}
			<AuthUserTaskInput
				className={clsxm('mx-auto w-full md:w-1/2 2xl:w-full lg:mr-10', !showInput && '!hidden md:!flex')}
			/>
			{/* )}  */}

			<button className="border rounded py-1 px-2 md:hidden" onClick={() => setShowInput((p) => !p)}>
				{showInput ? 'hide the issue input' : 'show the issue input'}
			</button>
			{/* Timer  */}
			{isTrackingEnabled ? <Timer /> : null}
		</Card>
	);
}
export default withAuthentication(MainPage, { displayName: 'MainPage' });
