import * as React from 'react';
import {
	AudioWaveform,
	MonitorSmartphone,
	LayoutDashboard,
	Heart,
	FolderKanban,
	SquareActivity,
	Command,
	Frame,
	GalleryVerticalEnd,
	Map,
	PieChart,
	LifeBuoy,
	Send,
	Files
} from 'lucide-react';

import { EverTeamsLogo, SymbolAppLogo } from '@/lib/components/svgs';
import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import { NavSecondary } from '@/components/nav-secondary';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarTrigger,
	useSidebar
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// This is sample data.
const data = {
	user: {
		name: 'evereq',
		email: 'evereq@ever.co',
		avatar: '/assets/svg/profile.svg'
	},
	teams: [
		{
			name: 'Strive Team',
			logo: GalleryVerticalEnd,
			plan: 'Enterprise'
		},
		{
			name: 'Ever Websites',
			logo: AudioWaveform,
			plan: 'Startup'
		},
		{
			name: 'Ever Team.',
			logo: Command,
			plan: 'Free'
		}
	],
	navMain: [
		{
			title: 'Dashboard',
			url: '/',
			icon: LayoutDashboard,
			isActive: true
		},
		{
			title: 'Favorites',
			url: '#',
			icon: Heart,
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
			items: [
				{
					title: "Team's Tasks",
					url: '#'
				},
				{
					title: 'My Tasks',
					url: '#'
				}
			]
		},
		{
			title: 'Projects',
			url: '#',
			icon: FolderKanban,
			items: [
				{
					title: 'Teams',
					url: '#'
				},
				{
					title: 'Gauzy',
					url: '#'
				},
				{
					title: 'IQ',
					url: '#'
				}
			]
		},
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
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { state } = useSidebar();
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
