'use client';
import { KanbanTabs } from '@app/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { cn } from '@/lib/utils';
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
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { CircleIcon } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/20/solid';

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
	const fullWidth = useAtomValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
	const employee = useSearchParams().get('employee');
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
		],
		[activeTeam?.name, currentLocale, t]
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
		const lastPath = breadcrumbPath.slice(-1)[0];
		if (employee) {
			if (lastPath.title == 'Kanban') {
				breadcrumbPath.push({
					title: employee,
					href: `/${currentLocale}/kanban?employee=${employee}`
				});
			} else {
				breadcrumbPath.pop();
				breadcrumbPath.push({
					title: employee,
					href: `/${currentLocale}/kanban?employee=${employee}`
				});
			}
		} else {
			if (lastPath.title !== 'Kanban') {
				breadcrumbPath.pop();
			}
		}
	}, [breadcrumbPath, currentLocale, employee]);
	return (
		<>
			<MainLayout
				title={`${t('common.KANBAN')} ${t('common.BOARD')}`}
				showTimer={isTrackingEnabled}
				isFooterFixed
				footerClassName={cn('bg-white dark:bg-[#1e2025]')}
				childrenClassName="flex flex-col w-full h-full overflow-hidden"
				// footerClassName={clsxm("fixed flex flex-col  items-end justify-center bottom-0 z-50 bg-white dark:bg-dark-high",!fullWidth && 'left-0 right-0')}
				mainHeaderSlot={
					<div
						className={
							'top-20 flex flex-col min-h-[263.4px] h-fit border-b-[1px] dark:border-[#26272C] z-10 mx-[0px] w-full bg-white dark:bg-dark-high'
						}
					>
						<Container fullWidth={fullWidth}>
							<div className="flex flex-row items-start justify-between mt-12 bg-white dark:bg-dark-high">
								<div className="flex items-center justify-center h-10 gap-8">
									<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
								<div className="flex items-center justify-center h-10 gap-1 w-max">
									<HeaderTabs kanban={true} linkAll={true} />
								</div>
							</div>
							<div className="flex items-center justify-between mt-10 bg-white dark:bg-dark-high">
								<h1 className="text-4xl font-semibold ">
									{t('common.KANBAN')} {t('common.BOARD')}
								</h1>
								<div className="flex items-center space-x-2 w-fit">
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
							<div className="relative flex flex-col items-center justify-between pt-10 bg-white z10 lg:flex-row dark:bg-dark-high">
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
								<div className="flex mt-5 space-x-2 lg:mt-0">
									<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
										<EpicPropertiesDropdown
											onValueChange={(_, values) => setEpics(values || [])}
											className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
											multiple={true}
										/>
									</div>
									{/* <div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"> */}
									<div className="relative z-10">
										<div className="bg-[#F2F2F2] dark:bg-dark--theme-light absolute flex items-center p-2 justify-between w-40 h-11 border input-border rounded-xl">
											<span className="flex">
												<div
													className="h-6 w-6 p-1.5 rounded-md mr-1"
													style={{
														backgroundColor: issues.bgColor ?? 'transparent'
													}}
												>
													{issues.icon ?? <CircleIcon className="w-3 h-3" />}
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
													className="w-5 h-5 z-10 p-0.5 cursor-pointer"
												>
													<XMarkIcon className="w-4 h-4 dark:text-white" />
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
							{/* <div className="w-full h-20 bg-red-500/50"></div> */}
						</Container>
					</div>
				}
			>
				{/** TODO:fetch teamtask based on days */}
				{activeTab && ( // add filter for today, yesterday and tomorrow
					<div className="flex flex-col flex-1 w-full h-full p-5">
						{Object.keys(data).length > 0 ? (
							<KanbanView isLoading={isLoading} kanbanBoardTasks={data} />
						) : (
							<KanbanBoardSkeleton />
						)}
					</div>
				)}
			</MainLayout>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
