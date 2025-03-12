import * as React from 'react';
import {
	MonitorSmartphone,
	LayoutDashboard,
	Heart,
	SquareActivity,
	Files,
	X,
	Command,
	AudioWaveform,
	GalleryVerticalEnd,
	FolderKanban
} from 'lucide-react';
import Image from 'next/image';

import { NavMain } from '@/components/nav-main';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarRail,
	SidebarTrigger,
	useSidebar,
	SidebarMenuSubButton,
	SidebarFooter
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuthenticateUser, useModal, useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { useFavoritesTask } from '@/app/hooks/features/useFavoritesTask';
import { CreateTeamModal, TaskIssueStatus } from '@/lib/features';
import { useTranslations } from 'next-intl';
import { WorkspacesSwitcher } from './workspace-switcher';
import { SidebarOptInForm } from './sidebar-opt-in-form';
import { NavProjects } from './nav-projects';
import { useActiveTeam } from '@/app/hooks/features/useActiveTeam';
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & { publicTeam: boolean | undefined };
export function AppSidebar({ publicTeam, ...props }: AppSidebarProps) {
	const { user } = useAuthenticateUser();
	const username = user?.name || user?.firstName || user?.lastName || user?.username;
	const { isTeamManager } = useOrganizationTeams();
	const { favoriteTasks, toggleFavorite } = useFavoritesTask();
	const { state } = useSidebar();
	const { isOpen, closeModal } = useModal();
	const t = useTranslations();
	const { activeTeam } = useActiveTeam();
	const { organizationProjects } = useOrganizationProjects();
	const projects = activeTeam
		? organizationProjects
				?.filter((el) => !el.isArchived)
				?.filter((el) => el.teams?.map((el) => el.id).includes(activeTeam.id))
		: []; // Consider projects for the active team

	// This is sample data.
	const data = {
		workspaces: [
			{
				name: 'Ever Teams',
				logo: ({ className }: { className?: string }) => (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={25}
						height={26}
						viewBox="0 0 25 26"
						fill="none"
						className={cn('size-5', className)}
					>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M.55 18.186l.325-.773 2.04-4.855-.007-.012-1.555-3.127-.167 6.846-.437-.01.173-7.14.283.006-.463-.93-.376-.756.814-.222 4.758-1.298L8.187.935l.348-.773.688.494.805.579.055-.27 7.701 1.565-.057.283 1.34-.367.915-.25-.039.947-.049 1.188.262-.13 3.286 6.604-.392.195-3.168-6.366-.164 4.005 4.177 3.116.701.524-.67.563-4.023 3.38v.003l-.018.015-.123 4.096 3.26-6.716.395.191-3.43 7.063-.238-.116-.03.997-.024.822-.806-.163-5.184-1.047-3.92 3.117-.67.533-.383-.767-.497-.999-.249.317-5.856-4.61.27-.344L8.2 23.177 6.324 19.41 1.37 18.36l-.82-.173zM13.743 3.905L10.35 1.466 17.408 2.9l-3.666 1.005zM2.479 17.177l1.25-2.98 1.806 3.627-3.056-.647zm4.788 1.015l.018.036 6.066 1.617 5.147-4.258-.17-6.256-.025-.018.002-.051-4.86-3.844-6.516 1.67-2.484 5.433 2.821 5.67zm2.325 4.673l-1.484-2.982 3.92 1.045-2.436 1.937zm8.766-1.973l-3.293-.665 3.397-2.81-.104 3.475zm4.005-8.549l-2.508 2.108-.111-4.063 2.62 1.955zM18.52 4.034l-.144 3.515-3.264-2.581 3.408-.934zM9.102 2.277l2.894 2.08-4.335 1.111 1.441-3.19zM2.359 8.33l2.83-.773-1.539 3.367L2.36 8.33zm-.087-1.78l5.134-4.742-.297-.322-5.134 4.742.297.322zm15.641 16.259l-6.936 1.61-.099-.426 6.936-1.61.1.426z"
							fill="url(#paint0_linear_11058_107682)"
						/>
						<defs>
							<linearGradient
								id="paint0_linear_11058_107682"
								x1="-2.65811"
								y1="11.7373"
								x2="11.928"
								y2="4.38343"
								gradientUnits="userSpaceOnUse"
							>
								<stop stopColor="#D24F39" />
								<stop offset={1} stopColor="#791EEC" />
							</linearGradient>
						</defs>
					</svg>
				),
				plan: 'Enterprise'
			},
			{
				name: 'Ever Gauzy',
				logo: AudioWaveform,
				plan: 'Startup'
			},
			{
				name: 'Ever Cloc',
				logo: GalleryVerticalEnd,
				plan: 'Free'
			},
			{
				name: 'Ever Rec',
				logo: Command,
				plan: 'Free'
			}
		],
		navMain: [
			{
				title: t('sidebar.DASHBOARD'),
				url: '#',
				selectable: false,
				icon: LayoutDashboard,
				label: 'dashboard',
				items: [
					{
						title: 'Team Dashboard',
						url: `/dashboard/team-dashboard/${user?.id}?name=${encodeURIComponent(username || '')}`,
						label: 'team dashboard'
					},
					{
						title: 'Apps & URLs',
						url: `/dashboard/app-url/${user?.id}?name=${encodeURIComponent(username || '')}`,
						label: 'apps-urls'
					}
				]
			},
			{
				title: t('sidebar.FAVORITES'),
				url: '#',
				selectable: false,
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
											<span className="flex justify-between items-center w-full min-w-fit">
												<Link href={`/task/${task?.id}`} className="flex items-center">
													{task && (
														// Show task issue and task number
														<TaskIssueStatus
															showIssueLabels={false}
															className={cn('flex gap-1 items-center px-2 mr-1 w-full')}
															task={task}
														/>
													)}
													<span className={cn('flex items-center font-normal')}>
														<small
															className={cn(
																'mr-1 text-xs font-normal text-gray-300 whitespace-nowrap text-nowrap'
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
				selectable: false,
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
			{
				title: t('sidebar.PROJECTS'),
				url: '/projects',
				selectable: true,
				icon: FolderKanban,
				label: 'projects',
				items: [
					...(projects
						? projects.map((project) => {
								return {
									title: project.name ?? '',
									label: 'project',
									url: `/projects/${project.id}`,
									icon: (
										<div
											style={{ backgroundColor: project.color }}
											className={cn(
												'flex overflow-hidden justify-center items-center w-8 h-8 rounded-full border'
											)}
										>
											{!project.imageUrl ? (
												project.name?.substring(0, 2)
											) : (
												<Image
													alt={project.name ?? ''}
													height={40}
													width={40}
													className="w-full h-full"
													src={project.imageUrl}
												/>
											)}
										</div>
									)
								};
							})
						: []),
					{
						title: 'Archived projects',
						url: '',
						label: 'Archived projects'
					}
				]
			},
			{
				title: t('sidebar.MY_WORKS'),
				url: '#',
				selectable: false,
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
							selectable: false,
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
									url: '/reports/weekly-limit'
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
									url: '/time-and-activity'
								}
							]
						}
					]
				: [])
		],
		projects: []
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
						'absolute  top-[8%] size-7 !bg-[#1C75FD] flex items-center justify-center !rounded-full transition-all duration-300 filter drop-shadow-[0px_0px_6px_rgba(28,117,253,0.30)] z-[55]'
					)}
				/>
				<SidebarHeader className={cn('mb-[1.4rem]', state === 'collapsed' ? 'items-center' : '')}>
					<WorkspacesSwitcher workspaces={data.workspaces} />
				</SidebarHeader>
				<SidebarContent>
					<NavMain items={data.navMain} />
					<NavProjects projects={data.projects} />
				</SidebarContent>

				<SidebarFooter className="p-1 mt-auto">
					<SidebarOptInForm />
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			{!publicTeam && <CreateTeamModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />}
		</>
	);
}
