'use client';

import { KanbanTabs } from '@app/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container, Divider } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { Footer, MainLayout } from 'lib/layout';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import ImageComponent, { ImageOverlapperProps } from 'lib/components/image-overlapper';
import Separator from '@components/ui/separator';
import HeaderTabs from '@components/pages/main/header-tabs';
import { AddIcon, PeoplesIcon } from 'assets/svg';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';
import { userTimezone } from '@app/helpers';
import KanbanSearch from '@components/pages/kanban/search-bar';
import {
	EpicPropertiesDropdown,
	StatusDropdown,
	TStatusItem,
	TaskLabelsDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
	taskIssues,
	useStatusValue
} from 'lib/features';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { CircleIcon } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import Head from 'next/head';
import { clsxm } from '@app/utils';

const Kanban = () => {
	const {
		data,
		setSearchTasks,
		searchTasks,
		isLoading,
		setPriority,
		setSizes,
		setLabels,
		setEpics,
		setIssues,
		issues
	} = useKanban();

	const { activeTeam, isTrackingEnabled } = useOrganizationTeams();
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useRecoilValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
	const employee = useSearchParams().get('employee');
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
		],
		[activeTeam?.name, currentLocale]
	);

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
	const { items } = useStatusValue<'issueType'>({
		status: taskIssues,
		value: issues as any,
		onValueChange: setIssues as any
	});

	useEffect(() => {
		if (employee) {
			const lastPath = breadcrumbPath.slice(-1)[0];
			if (lastPath.title == 'Kanban') {
				breadcrumbPath.push({ title: employee, href: `/${currentLocale}/kanban?employee=${employee}` });
			} else {
				breadcrumbPath.pop();
				breadcrumbPath.push({ title: employee, href: `/${currentLocale}/kanban?employee=${employee}` });
			}
		}
	}, [breadcrumbPath, currentLocale, employee]);
	return (
		<>
			<Head>
				<title>
					{t('common.KANBAN')} {t('common.BOARD')}
				</title>
			</Head>
			<MainLayout
				showTimer={isTrackingEnabled}
				footerClassName="hidden"
				// footerClassName={clsxm("fixed flex flex-col  items-end justify-center bottom-0 z-50 bg-white dark:bg-dark-high",!fullWidth && 'left-0 right-0')}
				className="h-[calc(100vh-_22px)]"
			>
				<div className="h-[263.4px] z-10 bg-white  dark:bg-dark-high fixed w-full"></div>
				<div
					className={
						'fixed top-20 flex flex-col border-b-[1px] dark:border-[#26272C]  z-10 mx-[0px] w-full bg-white dark:bg-dark-high'
					}
				>
					<Container fullWidth={fullWidth}>
						<div className="flex bg-white dark:bg-dark-high flex-row items-start justify-between mt-12">
							<div className="flex justify-center items-center gap-8 h-10">
								<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
								<Breadcrumb paths={breadcrumbPath} className="text-sm" />
							</div>
							<div className="flex h-10 w-max items-center justify-center   gap-1">
								<HeaderTabs kanban={true} linkAll={true} />
							</div>
						</div>
						<div className="flex justify-between items-center  mt-10 bg-white dark:bg-dark-high">
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
								<ImageComponent onAvatarClickRedirectTo="kanbanTasks" images={teamMembers} />
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
						<div className="relative flex flex-col lg:flex-row justify-between items-center  pt-10 bg-white dark:bg-dark-high">
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
								<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
									<EpicPropertiesDropdown
										onValueChange={(_, values) => setEpics(values || [])}
										className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
										multiple={true}
									/>
								</div>
								{/* <div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"> */}
								<div className="relative">
									<div className="bg-[#F2F2F2] dark:bg-dark--theme-light absolute flex items-center p-2 justify-between w-40 h-11 border input-border rounded-xl">
										<span className="flex">
											<div
												className="h-6 w-6 p-1.5 rounded-md mr-1"
												style={{
													backgroundColor: issues.bgColor ?? 'transparent'
												}}
											>
												{issues.icon ?? <CircleIcon className="h-3 w-3" />}
											</div>
											<p>{issues.name}</p>
										</span>
										{issues.value && (
											<div
												onClick={() =>
													setIssues({
														name: 'Issues',
														icon: null,
														bgColor: '',
														value: ''
													})
												}
												className="w-5 h-5 z-50 p-0.5 cursor-pointer"
											>
												<XMarkIcon className="h-4 w-4  dark:text-white" />
											</div>
										)}
									</div>

									<StatusDropdown
										taskStatusClassName={'w-40 bg-red-500 h-10 opacity-0'}
										showIssueLabels={true}
										items={items}
										value={issues}
										onChange={(e) => {
											setIssues(items.find((v) => v.name == e) as TStatusItem);
										}}
										issueType="issue"
									/>
								</div>
								{/* </div> */}
								<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
									<TaskLabelsDropdown
										onValueChange={(_, values) => setLabels(values || [])}
										className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
										multiple={true}
									/>
								</div>
								<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
									<TaskPropertiesDropdown
										onValueChange={(_, values) => setPriority(values || [])}
										className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
										multiple={true}
									/>
								</div>
								<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
									<TaskSizesDropdown
										onValueChange={(_, values) => setSizes(values || [])}
										className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
										multiple={true}
									/>
								</div>
								<div className="mt-1">
									<Separator />
								</div>
								<KanbanSearch setSearchTasks={setSearchTasks} searchTasks={searchTasks} />
							</div>
						</div>
						{/* <div className="h-20 w-full bg-red-500/50"></div> */}
					</Container>
				</div>
				<div className="mt-[256px] mb-24 ">
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
			<div className="bg-white dark:bg-[#1e2025]  w-screen z-[5000] fixed bottom-0">
				<Divider />
				<Footer
					className={clsxm(' justify-between w-full px-0  mx-auto', fullWidth ? 'px-8' : 'x-container')}
				/>
			</div>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
