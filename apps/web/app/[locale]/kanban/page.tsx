'use client';

import { KanbanTabs } from '@app/constants';
import {
  useAuthenticateUser,
  useModal,
  useOrganizationTeams
} from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import ImageComponent, {
  ImageOverlapperProps
} from 'lib/components/image-overlapper';
import Separator from '@components/ui/separator';
import HeaderTabs from '@components/pages/main/header-tabs';
import { AddIcon, PeoplesIcon } from 'assets/svg';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';
import { userTimezone } from '@app/helpers';
import KanbanSearch from '@components/pages/kanban/search-bar';
// import { TaskPropertiesDropdown, TaskSizesDropdown } from 'lib/features';

const Kanban = () => {
	const { data, setSearchTasks, searchTasks, isLoading } = useKanban();
	const { activeTeam } = useOrganizationTeams();
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
	const breadcrumbPath = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
	];

  const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];

  const teamMembers: ImageOverlapperProps[] = [];

  activeTeamMembers.map((member: any) => {
    teamMembers.push({
      id: member.employee.user.id,
      url: member.employee.user.imageUrl,
      alt: member.employee.user.firstName
    });
  });
  const tabs = [
    { name: t('common.TODAY'), value: KanbanTabs.TODAY },
    { name: t('common.YESTERDAY'), value: KanbanTabs.YESTERDAY },
    { name: t('common.TOMORROW'), value: KanbanTabs.TOMORROW }
  ];
  const { user } = useAuthenticateUser();
  const { openModal, isOpen, closeModal } = useModal();
  const timezone = userTimezone();

	return (
		<>
			<MainLayout showTimer={true}>
				<div className="h-[263.4px] z-10 bg-white dark:bg-dark--theme fixed w-full"></div>
				<div className={'fixed top-20 flex flex-col  z-10 mx-[0px] w-full'}>
					<div className="flex bg-white dark:bg-dark--theme mx-8  flex-row items-start justify-between mt-12">
						<div className="flex justify-center items-center gap-8 h-10">
							<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex h-10 w-max items-center justify-center   gap-1">
							<HeaderTabs kanban={true} linkAll={true} />
						</div>
					</div>
					<div className="flex justify-between items-center mx-8 mt-10 bg-white dark:bg-dark--theme">
						<h1 className="text-4xl font-semibold ">
							{t('common.KANBAN')} {t('common.BOARD')}
						</h1>
						<div className="flex w-fit items-center space-x-2">
							<strong className="text-gray-400">
								{`(`}
								{timezone.split('(')[1]}
							</strong>
							<div className="mt-1">
								<Separator />
							</div>
							<ImageComponent images={teamMembers} />
							<div className="mt-1">
								<Separator />
							</div>

							<button
								onClick={openModal}
								className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white"
							>
								{/* <AddIcon width={24} height={24} className={'dark:stroke-white'} /> */}
								<AddIcon className="w-6 h-6 text-foreground" />
							</button>
						</div>
					</div>
					<div className="relative flex flex-col lg:flex-row justify-between items-center px-8 pt-10 bg-white dark:bg-dark--theme">
						<div className="flex flex-row">
							{tabs.map((tab) => (
								<div
									key={tab.name}
									onClick={() => setActiveTab(tab.value)}
									className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
										activeTab === tab.value
											? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
											: 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
									}`}
									style={{
										borderBottomWidth: '3px',
										borderBottomStyle: 'solid'
									}}
								>
									{tab.name}
								</div>
							))}
						</div>
						<div className="flex space-x-2 mt-5 lg:mt-0">
							{/* <div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<TaskPropertiesDropdown
									onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
									className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
									multiple={true}
								/>
							</div>
							<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<TaskSizesDropdown
									onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
									className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
									multiple={true}
								/>
							</div>
							<div className="mt-1">
								<Separator />
							</div> */}

							<KanbanSearch setSearchTasks={setSearchTasks} searchTasks={searchTasks} />
						</div>
					</div>
					{/* <div className="h-20 w-full bg-red-500/50"></div> */}
				</div>
				<div className="mt-[256px]">
					{/** TODO:fetch teamtask based on days */}
					{activeTab && ( // add filter for today, yesterday and tomorrow
						<div>
							{Object.keys(data).length > 0 ? (
								<KanbanView isLoading={isLoading} kanbanBoardTasks={data} />
							) : (
								<KanbanBoardSkeleton />
							)}
						</div>
					)}
				</div>
			</MainLayout>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);

};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
