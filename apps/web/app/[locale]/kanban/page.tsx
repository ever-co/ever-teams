'use client';

import { KanbanTabs } from '@app/constants';
import { useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import VerticalLine from '@components/ui/svgs/vertificalline';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb } from 'lib/components';
import { stackImages } from 'lib/components/kanban-card';
import { AddIcon } from 'lib/components/svgs';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { OT_Member } from '@app/interfaces';
import type { AppProps } from 'next/app';
import { MyAppProps } from '@app/interfaces/AppProps';
import { JitsuRoot } from 'lib/settings/JitsuRoot';

const Kanban = ({ pageProps }: AppProps<MyAppProps>) => {
	const { data } = useKanban();
	const { activeTeam } = useOrganizationTeams();
	const t = useTranslations();
	const params = useParams<{ locale: string }>();

	const currentLocale = params ? params.locale : null;

	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);

	const breadcrumbPath = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: 'Kanban Board', href: `/${currentLocale}/kanban` }
	];

	const imageRadius = 20;
	const numberOfImagesDisplayed = 3;

	const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];
	const totalLength = (activeTeamMembers.length + 1) * imageRadius;

	return (
		<>
			<JitsuRoot pageProps={pageProps}>
				<MainLayout showTimer={true}>
					<div
						className={
							'fixed flex flex-col justify-between bg-white dark:bg-dark--theme h-[20vh] z-10 px-[32px] mx-[0px] w-full'
						}
					>
						<div className="flex flex-row items-center justify-between mt-[34px]">
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
							<div className="flex flex-row items-center gap-[12px]">
								<p>08:00 ( UTC +04:30 )</p>
								<VerticalLine />
								<div className="relative">
									<div
										className="flex h-fit flex-row justify-end items-center relative "
										style={{
											width: `${activeTeamMembers.length < 4 ? totalLength : 100}px`
										}}
									>
										{activeTeamMembers
											.filter((_: any, index: number) => {
												return index < numberOfImagesDisplayed;
											})
											.map((image: OT_Member, index: number) => {
												return (
													<div
														key={index}
														className="h-fit w-fit absolute"
														style={stackImages(
															index,
															activeTeamMembers.length < numberOfImagesDisplayed
																? activeTeamMembers.length
																: numberOfImagesDisplayed + 1
														)}
													>
														<div className="relative w-[40px] h-[40px]" key={index}>
															<Image
																src={
																	image.employee.user
																		? image.employee.user.imageUrl
																		: ''
																}
																alt={''}
																fill={true}
																className="rounded-full border-2 border-white"
															/>
														</div>
													</div>
												);
											})}
										{activeTeamMembers.length > numberOfImagesDisplayed && (
											<div
												className="flex flex-row text-sm text-[#282048] dark:text-white border-2 border-[#0000001a] dark:border-white bg-white dark:bg-transparent rounded-full font-semibold items-center justify-center z-20 h-[40px] w-[40px]"
												style={stackImages(3, 4)}
											>
												{activeTeamMembers.length - numberOfImagesDisplayed < 100
													? activeTeamMembers.length - numberOfImagesDisplayed
													: 99}
												+
											</div>
										)}
									</div>
								</div>
								<VerticalLine />
								<button className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white">
									<AddIcon width={24} height={24} className={'dark:stroke-white'} />
								</button>
							</div>
						</div>
						<div className="relative flex flex-row justify-between items-center ">
							<div className="flex flex-row">
								<div
									onClick={() => {
										setActiveTab(KanbanTabs.TODAY);
									}}
									className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
										activeTab === KanbanTabs.TODAY
											? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
											: 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
									}`}
									style={{
										borderBottomWidth: '3px',
										borderBottomStyle: 'solid'
									}}
								>
									Today
								</div>
								<div
									onClick={() => {
										setActiveTab(KanbanTabs.YESTERDAY);
									}}
									className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
										activeTab === KanbanTabs.YESTERDAY
											? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
											: 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
									}`}
									style={{
										borderBottomWidth: '3px',
										borderBottomStyle: 'solid'
									}}
								>
									Yesterday
								</div>
								<div
									onClick={() => {
										setActiveTab(KanbanTabs.TOMORROW);
									}}
									className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
										activeTab === KanbanTabs.TOMORROW
											? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
											: 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
									}`}
									style={{
										borderBottomWidth: '3px',
										borderBottomStyle: 'solid'
									}}
								>
									Tomorrow
								</div>
							</div>
							<div></div>
						</div>
					</div>
					<div className="mt-[20vh] overflow-y-auto max-h-[60vh] z-0">
						{/** TODO:fetch teamtask based on days */}
						{/** Kanbanboard for today tasks */}
						{activeTab === KanbanTabs.TODAY && (
							<>
								{Object.keys(data).length > 0 ? (
									<KanbanView kanbanBoardTasks={data} />
								) : (
									<KanbanBoardSkeleton />
								)}
							</>
						)}

						{/** Kanbanboard for yesterday tasks */}
						{activeTab === KanbanTabs.YESTERDAY && (
							<>
								{Object.keys(data).length > 0 ? (
									<KanbanView kanbanBoardTasks={data} />
								) : (
									<KanbanBoardSkeleton />
								)}
							</>
						)}

						{/** Kanbanboard for tomorrow tasks */}
						{activeTab === KanbanTabs.TOMORROW && (
							<>
								{Object.keys(data).length > 0 ? (
									<KanbanView kanbanBoardTasks={data} />
								) : (
									<KanbanBoardSkeleton />
								)}
							</>
						)}
					</div>
				</MainLayout>
			</JitsuRoot>
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
