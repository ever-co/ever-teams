'use client';
import * as React from 'react';
import { ChevronsUpDown, Plus, Loader2, AlertTriangle } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/core/components/common/sidebar';
import { useWorkspaces } from '@/core/hooks/auth';
import { useWorkspaceSwitcherSmart } from '@/core/hooks/auth/use-workspace-switcher';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/core/components/common/dialog';
import { Button } from '@/core/components/common/button';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { useModal } from '@/core/hooks/common/use-modal';
import { ModalSkeleton } from './skeleton/modal-skeleton';
import { Suspense } from 'react';

// Fallback for workspace icon
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

// Props for the workspace switch confirmation modal
interface WorkspaceSwitchConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	targetWorkspace: TWorkspace | null;
	currentWorkspace: TWorkspace | null;
	isLoading?: boolean;
}

// Workspace switch confirmation modal component
const WorkspaceSwitchConfirmModal: React.FC<WorkspaceSwitchConfirmModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	targetWorkspace,
	currentWorkspace,
	isLoading = false
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="sm:max-w-md"
				aria-labelledby="workspace-switch-title"
				aria-describedby="workspace-switch-description"
			>
				<DialogHeader>
					<DialogTitle id="workspace-switch-title" className="flex gap-2 items-center">
						<AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
						Changer the workspace ?
					</DialogTitle>
					<DialogDescription id="workspace-switch-description" className="space-y-3">
						<div className="text-sm text-muted-foreground">
							You are about to switch workspaces from{' '}
							<span className="font-medium text-foreground">
								"{currentWorkspace?.user.tenant.name ?? 'current workspace'}"
							</span>{' '}
							to{' '}
							<span className="font-medium text-foreground">
								"{targetWorkspace?.user.tenant.name ?? 'target workspace'}"
							</span>
							.
						</div>
						<div className="flex gap-3 items-center p-3 bg-amber-50 rounded-md border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
							<AlertTriangle
								className="flex-shrink-0 w-4 h-4 text-amber-600 dark:text-amber-400"
								aria-hidden="true"
							/>
							<span className="text-sm text-amber-800 dark:text-amber-200">
								This action will reload the application to synchronize all data.
							</span>
						</div>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:gap-2">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isLoading}
						className="mt-2 text-red-500 border border-red-500 sm:mt-0"
						aria-label="Cancel the workspace change"
					>
						Cancel
					</Button>
					<Button
						onClick={onConfirm}
						disabled={isLoading}
						className="min-w-[140px]"
						aria-label={`Confirm the change to ${targetWorkspace?.user.tenant.name}`}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 w-4 h-4 animate-spin" aria-hidden="true" />
								Changing...
							</>
						) : (
							'Confirm the change'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// Workspace skeleton component - pixel-perfect match for loading state
const WorkspaceSkeleton: React.FC = () => {
	return (
		<>
			{/* Icon skeleton - matches exact dimensions and styling */}
			<div
				className="flex justify-center items-center rounded-lg animate-pulse aspect-square size-6 bg-sidebar-primary text-sidebar-primary-foreground"
				aria-hidden="true"
				role="presentation"
			>
				<div className="rounded animate-pulse size-4 bg-sidebar-primary-foreground/20" />
			</div>

			{/* Text content skeleton - matches exact layout and dimensions */}
			<div className="grid flex-1 space-y-1 text-sm leading-tight text-left" role="presentation">
				{/* Main title skeleton */}
				<div
					className="h-[1.25rem] bg-sidebar-foreground/10 rounded animate-pulse"
					style={{ width: '70%' }}
					aria-hidden="true"
				/>
				{/* Subtitle skeleton */}
				<div
					className="h-[0.75rem] bg-sidebar-foreground/10 rounded animate-pulse"
					style={{ width: '40%' }}
					aria-hidden="true"
				/>
			</div>
		</>
	);
};

export function WorkspacesSwitcher() {
	const { isMobile } = useSidebar();

	// Use the new hooks with comprehensive state management
	const {
		workspaces,
		currentWorkspace,
		isLoading: workspacesLoading,
		isInitialized: workspacesInitialized,
		workspacesQuery
	} = useWorkspaces();

	// Use the smart workspace switcher hook (based on password component logic)
	const { switchToWorkspace, isLoading: isSwitching } = useWorkspaceSwitcherSmart();

	// Determine the actual current workspace with robust fallback logic
	const actualCurrentWorkspace = React.useMemo(() => {
		// Priority 1: currentWorkspace from store (based on activeWorkspaceId)
		if (currentWorkspace) {
			return currentWorkspace;
		}

		// (Active workspace is managed by activeWorkspaceId in the store)

		if (workspaces.length > 0) {
			return workspaces[0];
		}

		return null;
	}, [currentWorkspace, workspaces]);
	// Workspaces for dropdown - exclude only the actual current workspace
	const availableWorkspaces = workspaces.filter(
		(workspace) => workspace.user.tenant.id !== actualCurrentWorkspace?.user.tenant.id
	);

	// Simple state management for modal
	const [targetWorkspace, setTargetWorkspace] = React.useState<TWorkspace | null>(null);
	// Modal state for workspace switch confirmation
	const { isOpen: isConfirmModalOpen, openModal: openConfirmModal, closeModal: closeConfirmModal } = useModal();

	// Simple function to check if workspace switch is possible
	const canSwitchToWorkspace = React.useCallback(
		(workspaceId: string): boolean => {
			const workspace = workspaces.find((w) => w.user.tenant.id === workspaceId);
			return !!(
				workspace &&
				workspace.current_teams.length > 0 &&
				workspace.user.tenant.id !== actualCurrentWorkspace?.user.tenant.id
			);
		},
		[workspaces, actualCurrentWorkspace]
	);

	// Handling clicks on workspaces - now shows confirmation modal
	const handleWorkspaceClick = React.useCallback(
		(workspaceId: string) => {
			if (isSwitching || !canSwitchToWorkspace(workspaceId)) {
				return;
			}

			// Find the target workspace
			const workspace = workspaces.find((w) => w.user.tenant.id === workspaceId);
			if (!workspace) {
				return;
			}

			// Set target workspace and open confirmation modal
			setTargetWorkspace(workspace);
			openConfirmModal();
		},
		[isSwitching, canSwitchToWorkspace, workspaces, openConfirmModal]
	);

	// Note: switchToWorkspace function is now provided by useWorkspaceSwitcherSmart hook

	// Handle confirmed workspace switch
	const handleConfirmWorkspaceSwitch = React.useCallback(async () => {
		if (!targetWorkspace) {
			return;
		}

		// Switch to workspace using the smart hook
		switchToWorkspace(targetWorkspace);

		// Close modal and reset state
		closeConfirmModal();
		setTargetWorkspace(null);
	}, [targetWorkspace, switchToWorkspace, closeConfirmModal]);

	// Handle modal close
	const handleCloseModal = React.useCallback(() => {
		closeConfirmModal();
		setTargetWorkspace(null);
	}, [closeConfirmModal, setTargetWorkspace]);

	// Determine loading state with comprehensive logic
	const isWorkspaceLoading = React.useMemo(() => {
		// Check if we're in initial loading state
		const isInitialLoading = workspacesLoading && !workspacesInitialized;

		// Check if React Query is fetching for the first time
		const isQueryLoading = workspacesQuery.isLoading && !workspacesQuery.data;

		// Check if we're switching workspaces
		const isSwitchingWorkspace = isSwitching;

		// We're loading if any of these conditions are true
		return isInitialLoading || isQueryLoading || isSwitchingWorkspace;
	}, [workspacesLoading, workspacesInitialized, workspacesQuery.isLoading, workspacesQuery.data, isSwitching]);

	// Render the active workspace with robust state management
	const renderActiveWorkspace = () => {
		// Show skeleton during loading states
		if (isWorkspaceLoading) {
			return <WorkspaceSkeleton />;
		}

		// Show actual current workspace if available
		if (actualCurrentWorkspace) {
			return (
				<>
					<div className="flex justify-center items-center rounded-lg aspect-square size-7 bg-sidebar-primary text-sidebar-primary-foreground">
						{actualCurrentWorkspace.user.tenant.logo || actualCurrentWorkspace.user.tenant.name ? (
							<Avatar className="rounded !size-8">
								<AvatarImage
									width={24}
									height={24}
									src={actualCurrentWorkspace.user.tenant.logo}
									alt={actualCurrentWorkspace.user.tenant.name}
								/>
								<AvatarFallback>{actualCurrentWorkspace.user.tenant.name.charAt(0)}</AvatarFallback>
							</Avatar>
						) : (
							<DefaultWorkspaceIcon className="size-4" />
						)}
					</div>
					<div className="grid flex-1 text-sm leading-tight text-left">
						<span className="font-semibold truncate">{actualCurrentWorkspace.user.tenant.name}</span>
						{actualCurrentWorkspace.current_teams.length > 0 && (
							<span className="text-xs text-muted-foreground">
								{actualCurrentWorkspace.current_teams.length} team
								{actualCurrentWorkspace.current_teams.length > 1 ? 's' : ''}
							</span>
						)}
					</div>
				</>
			);
		}

		// Final fallback - default workspace display
		return (
			<>
				<div className="flex justify-center items-center rounded-lg aspect-square size-6 bg-sidebar-primary text-sidebar-primary-foreground">
					<DefaultWorkspaceIcon className="!size-6" />
				</div>
				<div className="grid flex-1 text-sm leading-tight text-left">
					<span className="font-semibold truncate">Ever Teams</span>
					<span className="text-xs truncate">Free</span>
				</div>
			</>
		);
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								disabled={isSwitching || isWorkspaceLoading}
								aria-label={
									isWorkspaceLoading
										? 'Loading workspace information...'
										: `Current workspace: ${actualCurrentWorkspace?.user.tenant.name || 'No workspace'}. Click to change the workspace`
								}
								aria-expanded={false}
								aria-haspopup="menu"
								aria-busy={isWorkspaceLoading}
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
							role="menu"
							aria-label="List of available workspaces"
						>
							<DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>

							{/* Display other workspaces (not current) */}
							{availableWorkspaces.length > 0 && (
								<>
									{
										// Only show OTHER workspaces
										availableWorkspaces.map((workspace) => {
											// Note: current_teams doesn't have members data, so we show team count only
											const teamCount = workspace.current_teams.length;
											return (
												<DropdownMenuItem
													key={workspace.user.tenant.id}
													onClick={() => handleWorkspaceClick(workspace.user.tenant.id)}
													className="gap-2 p-2"
													disabled={isSwitching}
													role="menuitem"
													aria-label={`Change to the workspace ${workspace.user.tenant.name} with ${teamCount} team${teamCount > 1 ? 's' : ''}`}
												>
													<div className="flex justify-center items-center rounded-sm border size-8">
														{workspace.user.tenant.logo ? (
															<Avatar className="rounded !size-6">
																<AvatarImage
																	src={workspace.user.tenant.logo}
																	alt={workspace.user.tenant.name}
																/>
																<AvatarFallback>
																	{workspace.user.tenant.name.charAt(0)}
																</AvatarFallback>
															</Avatar>
														) : (
															<DefaultWorkspaceIcon className="size-4" />
														)}
													</div>
													<div className="flex-1">
														<div className="font-medium">{workspace.user.tenant.name}</div>
														<div className="text-xs text-muted-foreground">
															{teamCount} team{teamCount > 1 ? 's' : ''}
														</div>
													</div>
												</DropdownMenuItem>
											);
										})
									}
								</>
							)}

							{/* Message if no other workspaces */}
							{workspaces.length > 0 && availableWorkspaces.length === 0 && (
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

			{/* Workspace Switch Confirmation Modal */}
			{isConfirmModalOpen && (
				<Suspense fallback={<ModalSkeleton />}>
					<WorkspaceSwitchConfirmModal
						isOpen={isConfirmModalOpen}
						onClose={handleCloseModal}
						onConfirm={handleConfirmWorkspaceSwitch}
						targetWorkspace={targetWorkspace}
						currentWorkspace={actualCurrentWorkspace}
						isLoading={isSwitching}
					/>
				</Suspense>
			)}
		</>
	);
}
