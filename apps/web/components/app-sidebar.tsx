import * as React from 'react';
import {
	AudioWaveform,
	MonitorSmartphone,
	LayoutDashboard,
	Heart,
	FolderKanban,
	SquareActivity,
	Command,
	GalleryVerticalEnd,
	Files
} from 'lucide-react';

import { TeamItem } from '@/lib/features/team/team-item';
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
	SidebarMenuSubButton,
	SidebarMenuSubItem
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOrganizationAndTeamManagers } from '@/app/hooks/features/useOrganizationTeamManagers';
import { useAuthenticateUser, useOrganizationTeams } from '@/app/hooks';
import { useActiveTeam } from '@/app/hooks/features/useActiveTeam';
import { SettingOutlineIcon } from '@/assets/svg';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { user } = useAuthenticateUser();
	const username = user?.name || user?.firstName || user?.lastName || user?.username;
	const { isTeamManager } = useOrganizationTeams();
	const { state } = useSidebar();
	const { onChangeActiveTeam, activeTeam } = useActiveTeam();
	// This is sample data.
	const data = {
		user: {
			name: 'evereq',
			email: 'evereq@ever.co',
			avatar: '/assets/svg/profile.svg'
		},
		navMain: [
			{
				title: 'Dashboard',
				url: '/',
				icon: LayoutDashboard,
				isActive: true,
				label: 'dashboard'
			},
			{
				title: 'Favorites',
				url: '#',
				icon: Heart,
				label: 'favorites',
				items: [
					{
						title: 'Working on UI Design ...',
						url: '#'
					},
					{
						title: 'As a team manager, I ...',
						url: '#'
					},
					{
						title: 'As a team manager, I ...',
						url: '#'
					}
				]
			},
			{
				title: 'Tasks',
				url: '#',
				icon: Files,
				label: 'tasks',
				items: [
					{
						title: "Team's Tasks",
						url: '/'
					},
					{
						title: 'My Tasks',
						url: `/profile/${user?.id}?name=${username || ''}`
					}
				]
			},
			...(userManagedTeams && userManagedTeams.length > 0
				? [
						{
							title: 'Projects',
							label: 'projects',
							url: '#',
							icon: FolderKanban,
							items: userManagedTeams
								.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
								.map((team, index) => ({
									title: team.name,
									url: '#',
									component: (
										<SidebarMenuSubButton
											key={index}
											className={cn(
												'hover:bg-[#eaeef4] first:mt-1 last:mb-1 flex items-center text-[#1F2937] dark:text-gray-50 data-[active=true]:bg-[#eaeef4] min-h-10 h-10 dark:hover:bg-sidebar-accent transition-colors duration-300',
												activeTeam?.name === team.name
													? ' dark:bg-sidebar-accent bg-[#eaeef4]'
													: ''
											)}
											asChild
										>
											<button
												className="flex items-center justify-between w-full "
												onClick={() => {
													onChangeActiveTeam({
														data: team
													} as TeamItem);
												}}
											>
												<span className="max-w-[90%] flex items-center">
													<TeamItem
														title={team.name}
														count={team.members?.length}
														className={cn(
															activeTeam?.name === team.name && 'font-medium',
															'flex items-center !mb-0'
														)}
														logo={team.image?.thumbUrl || team.image?.fullUrl || ''}
														color={team.color}
													/>
												</span>
												<SettingOutlineIcon className="w-5 h-5 cursor-pointer" />
											</button>
										</SidebarMenuSubButton>
									)
								}))
						}
					]
				: []),
			{
				title: 'My Works',
				url: '#',
				icon: MonitorSmartphone,
				items: [
					{
						title: 'Time & Activity',
						url: '#'
					},
					{
						title: 'Work Diary',
						url: '#'
					}
				]
			},
			...(isTeamManager
				? [
						{
							title: 'Reports',
							url: '#',
							icon: SquareActivity,
							items: [
								{
									title: 'Timesheets',
									url: '#'
								},
								{
									title: 'Manual Time Edit',
									url: '#'
								},
								{
									title: 'Weekly Limit',
									url: '#'
								},
								{
									title: 'Actual & Expected Hours',
									url: '#'
								},
								{
									title: 'Payments Due',
									url: '#'
								},
								{
									title: 'Project Budget',
									url: '#'
								},
								{
									title: 'Time & Activity',
									url: '#'
								}
							]
						}
					]
				: [])
		]
	};

	return (
		<Sidebar className={cn('z-[9999]', state === 'collapsed' ? 'items-center' : '')} collapsible="icon" {...props}>
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
	);
}
