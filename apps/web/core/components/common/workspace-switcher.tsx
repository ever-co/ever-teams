'use client';
import * as React from 'react';
import { ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/core/components/common/sidebar';
import { useWorkspaces, useWorkspaceSwitcher } from '@/core/hooks/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

// Composant de fallback pour l'icône de workspace
const DefaultWorkspaceIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={25}
		height={26}
		viewBox="0 0 25 26"
		fill="none"
		className={className}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M12.5 2C6.977 2 2.5 6.477 2.5 12s4.477 10 10 10 10-4.477 10-10S18.023 2 12.5 2zM7.5 12a5 5 0 1110 0 5 5 0 01-10 0z"
			fill="currentColor"
		/>
	</svg>
);

export function WorkspacesSwitcher() {
	const { isMobile } = useSidebar();

	// Use the new hooks
	const { workspaces, currentWorkspace, isLoading, error } = useWorkspaces();

	const { switchToWorkspace, isSwitching, canSwitchToWorkspace, clearError } = useWorkspaceSwitcher();

	// Fallback to legacy data if the new data is not available
	const activeWorkspace = workspaces.find((workspace) => workspace.isDefault);

	// Handling clicks on workspaces
	const handleWorkspaceClick = React.useCallback(
		async (workspaceId: string) => {
			if (isSwitching || !canSwitchToWorkspace(workspaceId)) {
				return;
			}

			// Clear previous errors
			if (error) {
				clearError();
			}

			await switchToWorkspace(workspaceId);
		},
		[isSwitching, canSwitchToWorkspace, error, clearError, switchToWorkspace]
	);

	// Render the active workspace
	const renderActiveWorkspace = () => {
		if (activeWorkspace) {
			// Legacy mode
			return (
				<>
					<div className="flex justify-center items-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
						{activeWorkspace.logo || activeWorkspace.name ? (
							<Avatar className="rounded size-6">
								<AvatarImage
									width={25}
									height={25}
									src={activeWorkspace.logo}
									alt={activeWorkspace.name}
								/>
								<AvatarFallback>{activeWorkspace.name.charAt(0)}</AvatarFallback>
							</Avatar>
						) : (
							<DefaultWorkspaceIcon className="size-4" />
						)}
					</div>
					<div className="grid flex-1 text-sm leading-tight text-left">
						<span className="font-semibold truncate">{activeWorkspace.name}</span>
						<span className="text-xs truncate">{activeWorkspace.plan}</span>
					</div>
				</>
			);
		}

		if (currentWorkspace) {
			// Real data mode
			return (
				<>
					<div className="flex justify-center items-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
						{currentWorkspace.logo || currentWorkspace.name ? (
							<Avatar className="rounded size-4">
								<AvatarImage
									width={25}
									height={25}
									src={currentWorkspace.logo}
									alt={currentWorkspace.name}
								/>
								<AvatarFallback>{currentWorkspace.name.charAt(0)}</AvatarFallback>
							</Avatar>
						) : (
							<DefaultWorkspaceIcon className="size-4" />
						)}
					</div>
					<div className="grid flex-1 text-sm leading-tight text-left">
						<span className="font-semibold truncate">{currentWorkspace.name}</span>
						{currentWorkspace.teams.length > 0 && (
							<span className="text-xs text-muted-foreground">
								{currentWorkspace.teams.length} team{currentWorkspace.teams.length > 1 ? 's' : ''}
							</span>
						)}
					</div>
				</>
			);
		}

		// Loading state or no workspace
		return (
			<>
				<div className="flex justify-center items-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
					<DefaultWorkspaceIcon className="size-4" />
				</div>
				<div className="grid flex-1 text-sm leading-tight text-left">
					<span className="font-semibold truncate">Ever Teams</span>
					<span className="text-xs truncate">Free</span>
				</div>
			</>
		);
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							disabled={isSwitching}
						>
							{renderActiveWorkspace()}
							{isSwitching ? (
								<Loader2 className="ml-auto animate-spin size-4" />
							) : (
								<ChevronsUpDown className="ml-auto size-4" />
							)}
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? 'bottom' : 'right'}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>

						{/* Display other workspaces (not current) */}
						{workspaces.length > 0 && (
							<>
								{workspaces
									.filter((workspace) => workspace.id !== currentWorkspace?.id) // Only show OTHER workspaces
									.map((workspace, index) => {
										const totalMembers = workspace.teams.reduce(
											(total: number, team: any) => total + (team.members?.length || 0),
											0
										);
										return (
											<DropdownMenuItem
												key={workspace.id}
												onClick={() => handleWorkspaceClick(workspace.id)}
												className="gap-2 p-2"
												disabled={isSwitching}
											>
												<div className="flex justify-center items-center rounded-sm border size-6">
													{workspace.logo ? (
														<img
															src={workspace.logo}
															alt={workspace.name}
															className="rounded size-4"
														/>
													) : (
														<DefaultWorkspaceIcon className="size-4" />
													)}
												</div>
												<div className="flex-1">
													<div className="font-medium">{workspace.name}</div>
													<div className="text-xs text-muted-foreground">
														{workspace.teams.length} team
														{workspace.teams.length > 1 ? 's' : ''} • {totalMembers} member
														{totalMembers > 1 ? 's' : ''}
													</div>
												</div>
												<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
											</DropdownMenuItem>
										);
									})}
							</>
						)}

						{/* Fallback to legacy data */}
						{workspaces.length === 0 && (
							<>
								{workspaces.map((workspace, index) => {
									return (
										<DropdownMenuItem key={workspace.name} className="gap-2 p-2" disabled>
											<div className="flex justify-center items-center rounded-sm border size-6">
												<Avatar>
													<AvatarImage src={workspace.logo} alt={workspace.name} />
													<AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
												</Avatar>
											</div>
											{workspace.name}
											<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
										</DropdownMenuItem>
									);
								})}
							</>
						)}

						{/* Message if no other workspaces */}
						{workspaces.length > 0 &&
							workspaces.filter((w) => w.id !== currentWorkspace?.id).length === 0 && (
								<DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
									<div className="flex justify-center items-center rounded-sm border size-6">
										<DefaultWorkspaceIcon className="size-4" />
									</div>
									No other workspace available
								</DropdownMenuItem>
							)}

						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2" disabled>
							<div className="flex justify-center items-center rounded-md border size-6 bg-background">
								<Plus className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">Add workspace</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
