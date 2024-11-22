'use client';
import * as React from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

export function WorkspacesSwitcher({
	workspaces
}: Readonly<{
	workspaces: {
		name: string;
		logo: React.ElementType;
		plan: string;
	}[];
}>) {
	const { isMobile } = useSidebar();
	const [activeWorkspace, setActiveWorkspace] = React.useState(workspaces[0]);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex items-center justify-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
								<activeWorkspace.logo className="size-4" />
							</div>
							<div className="grid flex-1 text-sm leading-tight text-left">
								<span className="font-semibold truncate">{activeWorkspace.name}</span>
								<span className="text-xs truncate">{activeWorkspace.plan}</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? 'bottom' : 'right'}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">Teams</DropdownMenuLabel>
						{workspaces.map((workspace, index) => (
							<DropdownMenuItem
								key={workspace.name}
								onClick={() => setActiveWorkspace(workspace)}
								className="gap-2 p-2"
							>
								<div className="flex items-center justify-center border rounded-sm size-6">
									<workspace.logo className="size-4 shrink-0" />
								</div>
								{workspace.name}
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2">
							<div className="flex items-center justify-center border rounded-md size-6 bg-background">
								<Plus className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">Add team</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
