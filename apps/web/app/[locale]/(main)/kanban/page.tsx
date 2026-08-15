'use client';
import { KanbanTabs } from '@/core/constants/config/constants';
import { useModal, useStatusValue } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import Separator from '@/core/components/common/separator';
import HeaderTabs from '@/core/components/common/header-tabs';
import { AddIcon, PeoplesIcon } from 'assets/svg';
import { userTimezone } from '@/core/lib/helpers/index';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { cn } from '@/core/lib/helpers';
import { useKanban } from '@/core/hooks/tasks/use-kanban';
import { taskIssues } from '@/core/components/tasks/task-issue';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { TTask } from '@/core/types/schemas/task/task.schema';
// dynamic import removed - using optimized components
import { KanbanViewSkeleton } from '@/core/components/common/skeleton/kanban-view-skeleton';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { KanbanPageSkeleton } from '@/core/components/layouts/skeletons/kanban-page-skeleton';
import { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';

// Import optimized components from centralized location
import {
	LazyKanbanView,
	LazyEpicPropertiesDropdown,
	LazyStatusDropdown,
	LazyTaskLabelsDropdown,
	LazyTaskPropertiesDropdown,
	LazyTaskSizesDropdown
} from '@/core/components/optimized-components';

// Next.js official patterns for always-rendered components (Kanban-specific)

// Import optimized components from centralized location
import {
	LazyImageComponent,
	LazyKanbanSearch,
	LazyInviteFormModal
} from '@/core/components/optimized-components/kanban';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const Kanban = () => {
	// Get all required hooks and states — single instance for the entire Kanban page.
	// Board operations are passed down to KanbanView via props (no duplicate hook instance).
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
		epics,
		issues,
		columns,
		taskStatuses,
		updateKanbanBoard,
		updateTaskStatus,
		isColumnCollapse,
		reorderStatus,
		addNewTask,
		toggleColumn
	} = useKanban();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	const activeTeam = useAtomValue(activeTeamState);
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useAtomValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.ALL);
	const employee = useSearchParams().get('employee');
	const { data: user } = useUserQuery();
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
			{ name: t('common.FILTER_ALL'), value: KanbanTabs.ALL },
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

		const filterByDate = (tasks: TTask[], date: Date) => {
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

		const board: Record<string, TTask[]> = {};
		Object.entries(data).forEach(([status, tasks]) => {
			let filteredStatusTasks;
			switch (activeTab) {
				case KanbanTabs.TODAY:
					filteredStatusTasks = filterByDate(tasks as TTask[], today);
					break;
				case KanbanTabs.YESTERDAY:
					filteredStatusTasks = filterByDate(tasks as TTask[], yesterday);
					break;
				case KanbanTabs.TOMORROW:
					filteredStatusTasks = filterByDate(tasks as TTask[], tomorrow);
					break;
				case KanbanTabs.ALL:
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

	// Show unified skeleton while initial data is loading
	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (isLoading || !data || !activeTeam) {
		return <KanbanPageSkeleton showTimer={isTrackingEnabled} fullWidth={fullWidth} />;
	}

	return (
		<>
			<PageLayout
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
							<div className="flex flex-row justify-between items-start mt-4 bg-white dark:bg-dark-high">
								<div className="flex gap-8 justify-center items-center h-10">
									<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
								<div className="flex gap-1 justify-center items-center h-10 w-fit">
									<HeaderTabs kanban={true} linkAll={true} />
								</div>
							</div>
							<div className="flex justify-between items-center mt-4 bg-white dark:bg-dark-high">
								<h1 className="text-4xl font-semibold">
									{t('common.KANBAN')} {t('common.BOARD')}
								</h1>
								<div className="flex gap-x-2 items-center min-w-fit">
									<strong className="text-gray-400">
										{`(`}
										{timezone.split('(')[1]}
									</strong>
									<div className="mt-1">
										<Separator />
									</div>
									<LazyImageComponent onAvatarClickRedirectTo="kanbanTasks" images={teamMembers} />
									<div className="mt-1">
										<Separator />
									</div>

									<button
										onClick={openModal}
										className="p-2 rounded-full relative z-50 border-2 border-[#0000001a] dark:border-white bg-white dark:bg-black"
									>
										<AddIcon className="w-6 h-6 text-foreground" />
									</button>
								</div>
							</div>
							<div className="flex flex-col gap-4 justify-between items-start pt-6 mb-4 bg-white xl:flex-row xl:items-center dark:bg-dark-high">
								<div className="flex flex-row overflow-x-auto no-scrollbar w-full xl:w-auto border-b border-gray-100 dark:border-[#26272C]">
									{tabs.map((tab) => (
										<div
											key={tab.name}
											onClick={() => setActiveTab(tab.value)}
											className={cn(
												'cursor-pointer px-4 pb-3 text-sm font-medium transition-all duration-200 whitespace-nowrap relative',
												activeTab === tab.value
													? 'text-[#3826A6] dark:text-white'
													: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
											)}
										>
											{tab.name}
											{activeTab === tab.value && (
												<div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#3826A6] dark:bg-white rounded-t-full" />
											)}
										</div>
									))}
								</div>

								<div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
									<LazyEpicPropertiesDropdown
										onValueChange={(_, values) => setEpics(values || [])}
										className="h-8 min-w-fit input-border flex items-center justify-center rounded-lg bg-white dark:bg-dark--theme-light px-2.5 text-sm"
										multiple
										taskStatusClassName="!text-sm"
										defaultValues={epics}
									/>

									<div className="flex relative z-10 justify-center items-center px-3 h-8 bg-white rounded-lg transition-colors min-w-fit input-border dark:bg-dark--theme-light hover:border-gray-300 dark:hover:border-gray-600">
										<div className="flex gap-2 items-center">
											{!issues?.value && (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													className="w-4 h-4 text-gray-500 dark:text-gray-400"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 6v6m0 0v6m0-6h6m-6 0H6"
													/>
												</svg>
											)}

											<LazyStatusDropdown
												taskStatusClassName="!bg-transparent !p-0 !text-sm"
												showIssueLabels
												className={cn(
													'border-none! bg-transparent! dark:text-white! p-0! h-auto!'
												)}
												items={items}
												value={issues}
												onChange={(e: any) =>
													setIssues(items.find((v) => v.name === e) as TStatusItem)
												}
												issueType="issue"
											/>

											{issues?.value ? (
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
													className="flex justify-center items-center ml-1 w-5 h-5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
												>
													<XMarkIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
												</button>
											) : (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													className="ml-1 w-4 h-4 text-gray-400 dark:text-gray-500"
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

									<LazyTaskLabelsDropdown
										onValueChange={(_, values: any) => setLabels(values || [])}
										className="h-8 relative min-w-fit input-border flex flex-col justify-center rounded-lg bg-white dark:bg-dark--theme-light px-2.5 text-sm"
										dropdownContentClassName="top-9"
										multiple
										taskStatusClassName="!text-sm"
									/>

									<LazyTaskPropertiesDropdown
										isMultiple={false}
										onValueChange={(_, values: any) => setPriority(values || [])}
										className="h-8 min-w-fit input-border rounded-lg bg-white dark:bg-dark--theme-light flex flex-col justify-center px-2.5 text-sm"
										multiple
										taskStatusClassName="!text-sm"
									/>

									<LazyTaskSizesDropdown
										onValueChange={(_, values: any) => setSizes(values || [])}
										className="h-8 relative min-w-fit input-border flex flex-col justify-center rounded-lg bg-white dark:bg-dark--theme-light px-2.5 text-sm"
										multiple
										taskStatusClassName="!text-sm"
									/>

									<div className="mx-1 w-px h-6 bg-gray-200 dark:bg-gray-700" />

									<LazyKanbanSearch
										setSearchTasks={setSearchTasks}
										searchTasks={searchTasks}
										className="mb-0!"
									/>
								</div>
							</div>
							{/* <div className="w-full h-20 bg-red-500/50"></div> */}
						</Container>
					</div>
				}
			>
				{/** TODO:fetch teamtask based on days */}

				{activeTab && (
					<div className="overflow-x-hidden px-0 mx-0 w-full">
						{Object.keys(filteredBoard).length > 0 ? (
							<div className="w-full h-full">
								<LazyKanbanView
									isLoading={isLoading}
									kanbanBoardTasks={filteredBoard}
									kanbanColumns={columns}
									taskStatuses={taskStatuses}
									updateKanbanBoard={updateKanbanBoard}
									updateTaskStatus={updateTaskStatus}
									isColumnCollapse={isColumnCollapse}
									reorderStatus={reorderStatus}
									addNewTask={addNewTask}
									toggleColumn={toggleColumn}
								/>
							</div>
						) : (
							<div className="flex flex-col flex-1 w-full h-full">
								<KanbanViewSkeleton fullWidth={fullWidth} />
							</div>
						)}
					</div>
				)}
			</PageLayout>
			{isOpen && !!user?.isEmailVerified && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<LazyInviteFormModal open={true} closeModal={closeModal} />
				</Suspense>
			)}
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
