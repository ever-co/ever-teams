'use client';
import { KanbanTabs } from '@/core/constants/config/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams, useStatusValue } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { KanbanView } from '@/core/components/pages/kanban/team-members-kanban-view';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import Separator from '@/core/components/common/separator';
import HeaderTabs from '@/core/components/common/header-tabs';
import { AddIcon, PeoplesIcon } from 'assets/svg';
import { InviteFormModal } from '@/core/components/teams/invite/invite-form-modal';
import { userTimezone } from '@/core/lib/helpers/index';
import KanbanSearch from '@/core/components/pages/kanban/search-bar';
import {
	EpicPropertiesDropdown,
	StatusDropdown,
	TStatusItem,
	TaskLabelsDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown
} from '@/core/components/tasks/task-status';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/fullWidth';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { cn } from '@/core/lib/helpers';
import { ITeamTask } from '@/core/types/interfaces';
import KanbanBoardSkeleton from '@/core/components/common/skeleton/kanban-board-skeleton';
import { useKanban } from '@/core/hooks/tasks/use-kanban';
import { taskIssues } from '@/core/components/tasks/task-issue';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

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
				footerClassName={cn(Object.values(filteredBoard).length > 3 ? '!pr-32' : 'pr-20')}
				className="!px-0"
				childrenClassName="flex flex-col h-hull w-full !mx-0 !px-0 overflow-x-auto"
				mainHeaderSlot={
					<div
						className={
							'flex flex-col min-h-fit border-b-[1px] dark:border-[#26272C] mx-[0px] w-full bg-white dark:bg-dark-high'
						}
					>
						<Container fullWidth={fullWidth} className="!pt-0">
							<div className="flex flex-row items-start justify-between mt-4 bg-white dark:bg-dark-high">
								<div className="flex items-center justify-center h-10 gap-8">
									<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
								<div className="flex items-center justify-center h-10 gap-1 w-fit">
									<HeaderTabs kanban={true} linkAll={true} />
								</div>
							</div>
							<div className="flex items-center justify-between mt-4 bg-white dark:bg-dark-high">
								<h1 className="text-4xl font-semibold">
									{t('common.KANBAN')} {t('common.BOARD')}
								</h1>
								<div className="flex items-center gap-x-2 min-w-fit">
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
										className="p-2 rounded-full relative z-10 border-2 border-[#0000001a] dark:border-white"
									>
										{/* <AddIcon width={24} height={24} className={'dark:stroke-white'} /> */}
										<AddIcon className="w-6 h-6 text-foreground" />
									</button>
								</div>
							</div>
							<div className="flex flex-col-reverse items-center justify-between pt-6 -mb-1 bg-white xl:flex-row dark:bg-dark-high">
								<div className="flex flex-row">
									{tabs.map((tab) => (
										<div
											key={tab.name}
											onClick={() => setActiveTab(tab.value)}
											className={`cursor-pointer pt-2 px-5 pb-[30px] text-base font-semibold ${
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
								<div className="flex gap-5 mt-4 lg:mt-0 min-h-8 max-h-10">
									<EpicPropertiesDropdown
										onValueChange={(_, values) => setEpics(values || [])}
										className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full"
										multiple
									/>
									<div className="relative z-10 flex items-center justify-center min-w-28 max-w-fit  lg:mt-0 input-border flex-col bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-4 max-h-full rounded-[8px]">
										<div className="absolute inset-0 flex items-center w-full h-full gap-0.5">
											{!issues?.value && (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 17 18"
													className="w-4 h-4 ml-2"
												>
													<path d="M8.5 16.5c4.125 0 7.5-3.375 7.5-7.5s-3.375-7.5-7.5-7.5S1 4.875 1 9s3.375 7.5 7.5 7.5Z" />
												</svg>
											)}

											<StatusDropdown
												taskStatusClassName="w-40 h-10 !bg-transparent"
												showIssueLabels
												className={cn(
													'h-fit w-fit !border-none !bg-transparent dark:!text-white ',
													issues?.value ? 'ml-2' : 'ml-0'
												)}
												items={items}
												value={issues}
												onChange={(e) =>
													setIssues(items.find((v) => v.name === e) as TStatusItem)
												}
												issueType="issue"
											/>
											<div className="flex items-center gap-1.5">
												{issues?.value && (
													<button
														onClick={() =>
															setIssues((prev: TStatusItem) => ({
																...prev,
																name: 'Issues',
																icon: null,
																bgColor: '',
																value: ''
															}))
														}
														className="flex items-center justify-center w-5 h-5 p-0.5 rounded-md cursor-pointer hover:bg-gray-100  dark:hover:bg-gray-900 dark:hover:text-white"
													>
														<XMarkIcon className="w-4 h-4 dark:text-white" />
													</button>
												)}

												{!issues?.value && (
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														aria-hidden="true"
														data-slot="icon"
														className="w-5 h-5 text-default dark:text-white"
													>
														<path
															fillRule="evenodd"
															d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
															clipRule="evenodd"
														/>
													</svg>
												)}
											</div>
										</div>
									</div>

									<TaskLabelsDropdown
										onValueChange={(_, values) => setLabels(values || [])}
										className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full"
										dropdownContentClassName="top-10"
										multiple
									/>

									<TaskPropertiesDropdown
										onValueChange={(_, values) => setPriority(values || [])}
										className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center"
										multiple
									/>

									<TaskSizesDropdown
										onValueChange={(_, values) => setSizes(values || [])}
										className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full"
										multiple
									/>
									<Separator
										className="inline-block mt-1 shrink-0 min-h-10 h-full w-0.5"
										orientation="vertical"
									/>
									<KanbanSearch setSearchTasks={setSearchTasks} searchTasks={searchTasks} />
								</div>
							</div>
							{/* <div className="w-full h-20 bg-red-500/50"></div> */}
						</Container>
					</div>
				}
			>
				{/** TODO:fetch teamtask based on days */}

				{activeTab && (
					<div className="container w-full px-0 mx-0 overflow-x-hidden">
						{isLoading || !data ? (
							<div className="flex flex-col gap-4">
								<div className="p-6 bg-white shadow-md dark:bg-dark--theme-light rounded-xl animate-pulse">
									<div className="w-1/4 h-4 mb-4 bg-gray-200 rounded dark:bg-dark--theme"></div>
									<div className="space-y-3">
										<div className="w-3/4 h-3 bg-gray-200 rounded dark:bg-dark--theme"></div>
										<div className="w-1/2 h-3 bg-gray-200 rounded dark:bg-dark--theme"></div>
										<div className="w-2/3 h-3 bg-gray-200 rounded dark:bg-dark--theme"></div>
									</div>
								</div>
								<div className="p-6 bg-white shadow-md dark:bg-dark--theme-light rounded-xl animate-pulse">
									<div className="w-1/4 h-4 mb-4 bg-gray-200 rounded dark:bg-dark--theme"></div>
									<div className="space-y-3">
										<div className="w-3/4 h-3 bg-gray-200 rounded dark:bg-dark--theme"></div>
										<div className="w-1/2 h-3 bg-gray-200 rounded dark:bg-dark--theme"></div>
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
					</div>
				)}
			</MainLayout>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
