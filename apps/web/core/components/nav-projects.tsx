'use client';

import { Folder, Forward, MoreHorizontal, Trash2, type LucideIcon, PlusIcon } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/ui/dropdown-menu';
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSubButton,
	useSidebar
} from '@/core/components/ui/sidebar';
import { useOrganizationAndTeamManagers } from '@/core/hooks/features/useOrganizationTeamManagers';
import { useAuthenticateUser } from '@/core/hooks';
import { Button } from '@/core/components/button';
import { useTranslations } from 'next-intl';

export function NavProjects({
	projects
}: {
	projects: {
		name: string;
		url: string;
		icon: LucideIcon;
	}[];
}) {
	const { isMobile } = useSidebar();

	const { user } = useAuthenticateUser();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const t = useTranslations();

	return userManagedTeams?.length > 0 ? (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>{t('sidebar.PROJECTS')}</SidebarGroupLabel>
			<SidebarMenu className="w-full max-w-[230px]">
				{projects && projects.length ? (
					<>
						{projects.map((item) => (
							<SidebarMenuItem className="w-full max-w-[230px]" key={item.name}>
								<SidebarMenuButton asChild>
									<a href={item.url}>
										<item.icon />
										<span>{item.name}</span>
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
										className="w-48 rounded-lg"
										side={isMobile ? 'bottom' : 'right'}
										align={isMobile ? 'end' : 'start'}
									>
										<DropdownMenuItem>
											<Folder className="text-muted-foreground" />
											<span>{t('common.VIEW_PROJECT')}</span>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Forward className="text-muted-foreground" />
											<span>{t('common.SHARE_PROJECT')}</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem>
											<Trash2 className="text-muted-foreground" />
											<span>{t('common.DELETE_PROJECT')}</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						))}
						<SidebarMenuItem className="w-full max-w-[230px]">
							<SidebarMenuButton className="text-sidebar-foreground/70">
								<MoreHorizontal className="text-sidebar-foreground/70" />
								<span>More</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</>
				) : (
					<SidebarMenuItem className="w-full max-w-[230px]">
						<SidebarMenuSubButton asChild>
							<Button
								className="w-full text-xs mt-3 dark:text-white rounded-xl border-[0.0938rem] max-w-[230px]"
								variant="outline"
								disabled={!user?.isEmailVerified}
							>
								<PlusIcon className="w-4 h-4" />
								{t('common.CREATE_PROJECT')}
							</Button>
						</SidebarMenuSubButton>
					</SidebarMenuItem>
				)}
			</SidebarMenu>
		</SidebarGroup>
	) : null;
}
