import { Folder, MoreHorizontal, Share, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar';

export function NavProjects({
	projects
}: Readonly<{
	projects: {
		name: string;
		url: string;
		icon: LucideIcon;
	}[];
}>) {
	const { isMobile, state } = useSidebar();

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarMenu className="gap-y-3">
				{projects.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<a href={item.url}>
								<item.icon />
								<span
									className={cn(
										'transition-all',
										state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
									)}
								>
									{item.name}
								</span>
							</a>
						</SidebarMenuButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuAction showOnHover>
									<MoreHorizontal />
									<span className="sr-only">More</span>
								</SidebarMenuAction>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-48"
								side={isMobile ? 'bottom' : 'right'}
								align={isMobile ? 'end' : 'start'}
							>
								<DropdownMenuItem>
									<Folder className="text-muted-foreground" />
									<span
										className={cn(
											'transition-all',
											state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
										)}
									>
										View Project
									</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Share className="text-muted-foreground" />
									<span
										className={cn(
											'transition-all',
											state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
										)}
									>
										Share Project
									</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<Trash2 className="text-muted-foreground" />
									<span
										className={cn(
											'transition-all',
											state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100'
										)}
									>
										Delete Project
									</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				))}
				<SidebarMenuItem>
					<SidebarMenuButton>
						<MoreHorizontal />
						<span
							className={cn('transition-all', state === 'collapsed' ? 'opacity-0 hidden' : 'opacity-100')}
						>
							More
						</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	);
}
