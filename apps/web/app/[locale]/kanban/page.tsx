'use client';

import { KanbanTabs } from '@app/constants';
import { useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import VerticalLine from '@components/ui/svgs/vertificalline';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb } from 'lib/components';
import { AddIcon } from 'lib/components/svgs';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Skeleton from 'react-loading-skeleton';
import ImageOverlapper, { IImageOverlapper } from 'lib/components/image-overlapper';

const Kanban = () => {
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

	const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];

	const teamMembers: IImageOverlapper[] = [];

	activeTeamMembers.map((member: any)=> {
		teamMembers.push({
			id: member.employee.user.id,
			url: member.employee.user.imageUrl,
			alt: member.employee.user.firstName
		})
	});

	return (
		<>
			<MainLayout
				showTimer={true}
			>
				<div className={'fixed flex flex-col bg-white dark:bg-dark--theme h-auto z-10 px-[32px] mx-[0px] w-full'}>
					<div className="flex flex-row items-center justify-between mt-[34px]">
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						<div className="flex flex-row items-center gap-[12px]">
							{activeTeamMembers.length > 0 ? 
								<p>08:00 ( UTC +04:30 )</p>
							:
								<Skeleton height={20} width={120} borderRadius={5} className="rounded-full dark:bg-[#353741]" />
							}
							<VerticalLine /> 
								<ImageOverlapper images={teamMembers}/>
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
				<div className="mt-[15vh] z-0">
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
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
