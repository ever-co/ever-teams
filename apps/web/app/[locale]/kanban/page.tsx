'use client';
import { KanbanTabs } from '@app/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
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
import { cn } from '@/lib/utils';
import { ITeamTask } from '@app/interfaces';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';

const Kanban = () => {
	// Get all required hooks and states
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
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();
	const timezone = userTimezone();

	// Memoize breadcrumb path to prevent unnecessary recalculations
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	// Memoize team members data transformation
	const teamMembers = useMemo(() => {
		const members: ImageOverlapperProps[] = [];
		const activeTeamMembers = activeTeam?.members || [];

		activeTeamMembers.forEach((member: any) => {
			members.push({
				id: member.employee.user.id,
				url: member.employee.user.imageUrl,
				alt: member.employee.user.firstName
			});
		});

		return members;
	}, [activeTeam?.members]);

	// Memoize tabs to prevent recreation on each render
	const tabs = useMemo(
		() => [
			{ name: t('common.TODAY'), value: KanbanTabs.TODAY },
			{ name: t('common.YESTERDAY'), value: KanbanTabs.YESTERDAY },
			{ name: t('common.TOMORROW'), value: KanbanTabs.TOMORROW }
		],
		[t]
	);

	// Memoize status items
	const { items } = useStatusValue<'issueType'>({
		status: taskIssues,
		value: issues as any,
		onValueChange: setIssues as any
	});

	// Memoize filtered tasks based on date
	const filteredBoard = useMemo(() => {
		if (!data) return {};

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const filterByDate = (tasks: ITeamTask[], date: Date) => {
			const filtered = tasks.filter((task) => {
				if (!task.createdAt) {
					return false;
				}

				const taskDate = new Date(task.createdAt);
				const localTaskDate = new Date(taskDate.getTime() - taskDate.getTimezoneOffset() * 60000);
				localTaskDate.setHours(0, 0, 0, 0);

				const compareDate = new Date(date.getTime());
				compareDate.setHours(0, 0, 0, 0);

				return localTaskDate.toDateString() === compareDate.toDateString();
			});

			return filtered;
		};

		const board: Record<string, ITeamTask[]> = {};
		Object.entries(data).forEach(([status, tasks]) => {
			let filteredStatusTasks;
			switch (activeTab) {
				case KanbanTabs.TODAY:
					filteredStatusTasks = filterByDate(tasks as ITeamTask[], today);
					break;
				case KanbanTabs.YESTERDAY:
					filteredStatusTasks = filterByDate(tasks as ITeamTask[], yesterday);
					break;
				case KanbanTabs.TOMORROW:
					filteredStatusTasks = filterByDate(tasks as ITeamTask[], tomorrow);
					break;
				default:
					filteredStatusTasks = tasks;
			}
			board[status] = filteredStatusTasks;
		});

		return board;
	}, [data, activeTab]);

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
		} else if (lastPath.title !== 'Kanban') {
			breadcrumbPath.pop();
		}
	}, [breadcrumbPath, currentLocale, employee]);

	return (
		<>
			<MainLayout
				title={`${t('common.KANBAN')} ${t('common.BOARD')}`}
				showTimer={isTrackingEnabled}
				childrenClassName="flex flex-col h-hull w-full"
				mainHeaderSlot={
					<div
						className={
							'flex flex-col min-h-fit border-b-[1px] dark:border-[#26272C] mx-[0px] w-full bg-white dark:bg-dark-high'
						}
					>
						<Container fullWidth={fullWidth} className="!pt-0">
							<div className="flex flex-row justify-between items-start mt-4 bg-white dark:bg-dark-high">
								<div className="flex gap-8 justify-center items-center h-10">
									<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
								<div className="flex gap-1 justify-center items-center w-max h-10">
									<HeaderTabs kanban={true} linkAll={true} />
								</div>
							</div>
							<div className="flex justify-between items-center mt-4 bg-white dark:bg-dark-high">
								<h1 className="text-4xl font-semibold">
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
							<div className="flex flex-col-reverse justify-between items-center pt-6 -mb-1 bg-white xl:flex-row dark:bg-dark-high">
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
								<div className="flex gap-5 mt-4 lg:mt-0">
									<div className="">
										<EpicPropertiesDropdown
											onValueChange={(_, values) => setEpics(values || [])}
											className="lg:min-w-[140px] pt-[3px] mb-2 lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light max-h-11"
											multiple={true}
										/>
									</div>
									<div className="pr-[90px]">
										<div className="inline-block relative z-10">
											<div className="absolute inset-0 flex items-center justify-between w-40 h-11 p-2 bg-[#F2F2F2] dark:bg-dark--theme-light border input-border rounded-xl shadow-sm">
												<div className="flex items-center">
													<div
														className="flex items-center justify-center w-6 h-6 p-1.5 mr-1 rounded-md"
														style={{ backgroundColor: issues?.bgColor ?? 'transparent' }}
													>
														{issues?.icon ?? <CircleIcon className="w-3 h-3" />}
													</div>
													<span className="text-sm">{issues?.name ?? 'Issues'}</span>
												</div>
												{issues?.value && (
													<button
														onClick={() =>
															setIssues((prev) => ({
																...prev,
																name: 'Issues',
																icon: null,
																bgColor: '',
																value: ''
															}))
														}
														className="flex items-center justify-center w-5 h-5 p-0.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-hover"
													>
														<XMarkIcon className="w-4 h-4 dark:text-white" />
													</button>
												)}
											</div>

											<StatusDropdown
												taskStatusClassName="w-40 h-10 opacity-0"
												showIssueLabels
												items={items}
												value={issues}
												onChange={(e) =>
													setIssues(items.find((v) => v.name === e) as TStatusItem)
												}
												issueType="issue"
											/>
										</div>
									</div>
									<div>
										<TaskLabelsDropdown
											onValueChange={(_, values) => setLabels(values || [])}
											className="lg:min-w-[140px] pt-[3px] mb-2 lg:mt-0 input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"
											multiple={true}
										/>
									</div>
									<div>
										<TaskPropertiesDropdown
											onValueChange={(_, values) => setPriority(values || [])}
											className="lg:min-w-[140px] pt-[3px] mb-2 lg:mt-0 input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"
											multiple={true}
										/>
									</div>
									<div>
										<TaskSizesDropdown
											onValueChange={(_, values) => setSizes(values || [])}
											className="lg:min-w-[140px] pt-[3px] mb-2 lg:mt-0 input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"
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

				<div className="pt-10">
					{activeTab && (
						<Container fullWidth={fullWidth} className={cn('!pt-0 px-5')}>
							{isLoading || !data ? (
								<div className="flex flex-col gap-4">
									<div className="bg-white dark:bg-dark--theme-light rounded-xl p-6 shadow-md animate-pulse">
										<div className="h-4 bg-gray-200 dark:bg-dark--theme rounded w-1/4 mb-4"></div>
										<div className="space-y-3">
											<div className="h-3 bg-gray-200 dark:bg-dark--theme rounded w-3/4"></div>
											<div className="h-3 bg-gray-200 dark:bg-dark--theme rounded w-1/2"></div>
											<div className="h-3 bg-gray-200 dark:bg-dark--theme rounded w-2/3"></div>
										</div>
									</div>
									<div className="bg-white dark:bg-dark--theme-light rounded-xl p-6 shadow-md animate-pulse">
										<div className="h-4 bg-gray-200 dark:bg-dark--theme rounded w-1/4 mb-4"></div>
										<div className="space-y-3">
											<div className="h-3 bg-gray-200 dark:bg-dark--theme rounded w-3/4"></div>
											<div className="h-3 bg-gray-200 dark:bg-dark--theme rounded w-1/2"></div>
										</div>
									</div>
								</div>
							) : Object.keys(filteredBoard).length > 0 ? (
								<KanbanView isLoading={isLoading} kanbanBoardTasks={filteredBoard} />
							) : (
								<div className="flex flex-col flex-1 w-full h-full">
									<KanbanBoardSkeleton />
								</div>
							)}
						</Container>
					)}
				</div>
			</MainLayout>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
