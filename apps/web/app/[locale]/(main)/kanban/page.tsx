'use client';
import { KanbanTabs } from '@/core/constants/config/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams, useStatusValue } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
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
import dynamic from 'next/dynamic';
import { KanbanViewSkeleton } from '@/core/components/common/skeleton/kanban-view-skeleton';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { KanbanPageSkeleton } from '@/core/components/layouts/skeletons/kanban-page-skeleton';
import { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';

// Next.js official patterns for always-rendered components
const LazyKanbanView = dynamic(
	() =>
		import('@/core/components/pages/kanban/team-members-kanban-view').then((mod) => ({ default: mod.KanbanView })),
	{
		ssr: false,
		loading: () => <KanbanViewSkeleton fullWidth={true} />
	}
);

const LazyImageComponent = dynamic(() => import('@/core/components/common/image-overlapper'), {
	ssr: false,
	loading: () => <div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
});

const LazyKanbanSearch = dynamic(() => import('@/core/components/pages/kanban/search-bar'), {
	ssr: false,
	loading: () => (
		<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
			<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
		</div>
	)
});

const LazyEpicPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => ({ default: mod.EpicPropertiesDropdown })),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

const LazyStatusDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => ({ default: mod.StatusDropdown })),
	{
		ssr: false,
		loading: () => <div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

const LazyTaskLabelsDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => ({ default: mod.TaskLabelsDropdown })),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

const LazyTaskPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => ({ default: mod.TaskPropertiesDropdown })),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-2" />
			</div>
		)
	}
);

const LazyTaskSizesDropdown = dynamic(
	() => import('@/core/components/tasks/task-sizes-dropdown').then((mod) => ({ default: mod.TaskSizesDropdown })),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

// Medium article pattern for conditional rendering (modals)
const LazyInviteFormModal = dynamic(
	() =>
		import('@/core/components/features/teams/invite-form-modal').then((mod) => ({ default: mod.InviteFormModal })),
	{
		ssr: false
		// Note: No loading property for conditional components
		// Suspense fallback will handle loading states
	}
);

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
										className="p-2 rounded-full relative z-10 border-2 border-[#0000001a] dark:border-white"
									>
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
								<div className="flex gap-5 mt-4 max-h-10 lg:mt-0 min-h-8">
									<LazyEpicPropertiesDropdown
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
													className="ml-2 w-4 h-4"
												>
													<path d="M8.5 16.5c4.125 0 7.5-3.375 7.5-7.5s-3.375-7.5-7.5-7.5S1 4.875 1 9s3.375 7.5 7.5 7.5Z" />
												</svg>
											)}

											<LazyStatusDropdown
												taskStatusClassName="w-40 h-10 !bg-transparent"
												showIssueLabels
												className={cn(
													'h-fit w-fit !border-none !bg-transparent dark:!text-white ',
													issues?.value ? 'ml-2' : 'ml-0'
												)}
												items={items}
												value={issues}
												onChange={(e: any) =>
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

									<LazyTaskLabelsDropdown
										onValueChange={(_, values: any) => setLabels(values || [])}
										className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full"
										dropdownContentClassName="top-10"
										multiple
									/>

									<LazyTaskPropertiesDropdown
										isMultiple={false}
										onValueChange={(_, values: any) => setPriority(values || [])}
										className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center"
										multiple
									/>

									<LazyTaskSizesDropdown
										onValueChange={(_, values: any) => setSizes(values || [])}
										className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full"
										multiple
									/>
									<Separator
										className="inline-block mt-1 shrink-0 min-h-10 h-full w-0.5"
										orientation="vertical"
									/>
									<LazyKanbanSearch setSearchTasks={setSearchTasks} searchTasks={searchTasks} />
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
								<LazyKanbanView isLoading={isLoading} kanbanBoardTasks={filteredBoard} />
							</div>
						) : (
							<div className="flex flex-col flex-1 w-full h-full">
								<KanbanViewSkeleton fullWidth={fullWidth} />
							</div>
						)}
					</div>
				)}
			</MainLayout>
			{isOpen && !!user?.isEmailVerified && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<LazyInviteFormModal open={true} closeModal={closeModal} />
				</Suspense>
			)}
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
