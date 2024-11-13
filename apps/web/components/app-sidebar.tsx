import * as React from 'react';
import {
	MonitorSmartphone,
	LayoutDashboard,
	Heart,
	FolderKanban,
	SquareActivity,
	PlusIcon,
	Files,
	X
} from 'lucide-react';

import { EverTeamsLogo, SymbolAppLogo } from '@/lib/components/svgs';
import { NavMain } from '@/components/nav-main';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarTrigger,
	useSidebar,
	SidebarMenuSubButton
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOrganizationAndTeamManagers } from '@/app/hooks/features/useOrganizationTeamManagers';
import { useAuthenticateUser, useModal, useOrganizationTeams } from '@/app/hooks';
import { useFavoritesTask } from '@/app/hooks/features/useFavoritesTask';
import { Button } from '@/lib/components/button';
import { CreateTeamModal, TaskIssueStatus } from '@/lib/features';
import { useTranslations } from 'next-intl';
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & { publicTeam: boolean | undefined };
export function AppSidebar({ publicTeam, ...props }: AppSidebarProps) {
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { user } = useAuthenticateUser();
	const username = user?.name || user?.firstName || user?.lastName || user?.username;
	const { isTeamManager } = useOrganizationTeams();
	const { favoriteTasks, toggleFavorite } = useFavoritesTask();
	const { state } = useSidebar();
	const { isOpen, closeModal } = useModal();
	const t = useTranslations();
	// This is sample data.
	const data = {
		user: {
			name: 'evereq',
			email: 'evereq@ever.co',
			avatar: '/assets/svg/profile.svg'
		},
		navMain: [
			{
				title: t('sidebar.DASHBOARD'),
				url: '/',
				icon: LayoutDashboard,
				isActive: true,
				label: 'dashboard'
			},
			{
				title: t('sidebar.FAVORITES'),
				url: '#',
				icon: Heart,
				label: 'favorites',
				items:
					favoriteTasks && favoriteTasks.length > 0
						? favoriteTasks
								.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
								.map((task, index) => ({
									title: task?.title,
									url: '#',
									component: (
										<SidebarMenuSubButton
											key={index}
											className={cn(
												'hover:bg-[#eaeef4] first:mt-1 last:mb-1 flex items-center text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent transition-colors duration-300'
											)}
											asChild
										>
											<span className="flex items-center justify-between w-full min-w-fit">
												<Link href={`/task/${task?.id}`} className="flex items-center">
													{task && (
														// Show task issue and task number
														<TaskIssueStatus
															showIssueLabels={false}
															className={cn('w-full px-2 flex items-center gap-1 mr-1')}
															task={task}
														/>
													)}
													<span className={cn('font-normal flex items-center')}>
														<small
															className={cn(
																'text-gray-300 text-nowrap whitespace-nowrap text-xs mr-1 font-normal'
															)}
														>
															#{task?.taskNumber}
														</small>
														<span
															className={cn(
																'!font-light text-nowrap text-sm max-w-[100px] whitespace-nowrap text-ellipsis overflow-hidden'
															)}
														>
															{task?.title}
														</span>
													</span>
												</Link>
												<X
													className="w-5 h-5 cursor-pointer"
													onClick={() => toggleFavorite(task)}
												/>
											</span>
										</SidebarMenuSubButton>
									)
								}))
						: [
								{
									title: t('common.NO_FAVORITE_TASK'),
									url: '#',
									label: 'no-task'
								}
							]
			},
			{
				title: t('sidebar.TASKS'),
				url: '#',
				icon: Files,
				label: 'tasks',
				items: [
					{
						title: t('sidebar.TEAMTASKS'),
						url: '/team/tasks',
						label: 'team-tasks'
					},
					{
						title: t('sidebar.MY_TASKS'),
						url: `/profile/${user?.id}?name=${encodeURIComponent(username || '')}`,
						label: 'my-tasks'
					}
				]
			},
			...(userManagedTeams && userManagedTeams.length > 0
				? [
						{
							title: t('sidebar.PROJECTS'),
							label: 'projects',
							url: '#',
							icon: FolderKanban,
							items: [
								{
									title: t('common.NO_PROJECT'),
									label: 'no-project',
									url: '#',
									component: (
										<SidebarMenuSubButton asChild>
											<Button
												className="w-full text-xs mt-3 dark:text-white rounded-xl border-[0.0938rem]"
												variant="outline"
												disabled={!user?.isEmailVerified}
											>
												<PlusIcon className="w-4 h-4" />
												{t('common.CREATE_PROJECT')}
											</Button>
										</SidebarMenuSubButton>
									)
								}
							]
						}
					]
				: []),
			{
				title: t('sidebar.MY_WORKS'),
				url: '#',
				icon: MonitorSmartphone,
				label: 'my-work',
				items: [
					{
						title: t('sidebar.TIME_AND_ACTIVITY'),
						label: 'time-and-activity',
						url: '#'
					},
					{
						title: t('sidebar.WORK_DIARY'),
						label: 'work-and-diary',
						url: '#'
					}
				]
			},
			...(isTeamManager
				? [
						{
							title: t('sidebar.REPORTS'),
							label: 'reports',
							url: '#',
							icon: SquareActivity,
							items: [
								{
									title: t('sidebar.TIMESHEETS'),
									url: `/timesheet/${user?.id}?name=${encodeURIComponent(username || '')}`,
									label: 'timesheets'
								},
								{
									title: t('sidebar.MANUAL_TIME_EDIT'),
									label: 'manual-time-edit',
									url: '#'
								},
								{
									title: t('sidebar.WEEKLY_LIMIT'),
									label: 'weekly-limit',
									url: '/reports/weekly'
								},
								{
									title: t('sidebar.ACTUAL_AND_EXPECTED_HOURS'),
									label: 'actual-and-expected-hours',
									url: '#'
								},
								{
									title: t('sidebar.PAYMENTS_DUE'),
									label: 'payments-due',
									url: '#'
								},
								{
									title: t('sidebar.PROJECT_BUDGET'),
									label: 'project-budget',
									url: '#'
								},
								{
									title: t('sidebar.TIME_AND_ACTIVITY'),
									label: 'time-and-activity',
									url: '#'
								}
							]
						}
					]
				: [])
		]
	};

	return (
		<>
			<Sidebar
				className={cn('z-[9999]', state === 'collapsed' ? 'items-center' : '')}
				collapsible="icon"
				{...props}
			>
				<SidebarTrigger
					className={cn(
						state === 'collapsed' ? 'right-[-20%]' : ' right-[-5%]',
						'absolute  top-[10.5%] size-7 !bg-[#1C75FD] flex items-center justify-center !rounded-full transition-all duration-300 filter drop-shadow-[0px_0px_6px_rgba(28,117,253,0.30)] z-[55]'
					)}
				/>
				<SidebarHeader className={cn('mb-[1.4rem]', state === 'collapsed' ? 'items-center' : '')}>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								className={cn(state === 'collapsed' ? 'items-center justify-center' : '')}
								size="lg"
								asChild
							>
								<Link href="/">
									<div className="flex items-center justify-center rounded-lg aspect-square size-8 text-sidebar-primary-foreground">
										<SymbolAppLogo className="size-5" />
									</div>
									{state === 'expanded' && <EverTeamsLogo dash />}
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<NavMain items={data.navMain} />
				</SidebarContent>
				<SidebarRail />
			</Sidebar>

			{!publicTeam && <CreateTeamModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />}
		</>
	);
}
