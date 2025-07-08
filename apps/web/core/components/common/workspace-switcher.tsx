'use client';
import * as React from 'react';
import { ChevronsUpDown, Plus, Loader2, AlertTriangle } from 'lucide-react';

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
	// Handle keyboard navigation and accessibility
	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'Enter' && !isLoading) {
				event.preventDefault();
				onConfirm();
			} else if (event.key === 'Escape' && !isLoading) {
				event.preventDefault();
				onClose();
			}
		},
		[onConfirm, onClose, isLoading]
	);

	// Focus management - ensure focus returns to trigger when modal closes
	React.useEffect(() => {
		if (!isOpen) {
			// Focus will be managed by Radix Dialog automatically
			return;
		}
	}, [isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="sm:max-w-md"
				onKeyDown={handleKeyDown}
				aria-labelledby="workspace-switch-title"
				aria-describedby="workspace-switch-description"
			>
				<DialogHeader>
					<DialogTitle id="workspace-switch-title" className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
						Changer de workspace ?
					</DialogTitle>
					<DialogDescription id="workspace-switch-description" className="space-y-3">
						<div className="text-sm text-muted-foreground">
							Vous allez passer du workspace{' '}
							<span className="font-medium text-foreground">
								"{currentWorkspace?.name || 'Workspace actuel'}"
							</span>{' '}
							vers{' '}
							<span className="font-medium text-foreground">
								"{targetWorkspace?.name || 'Nouveau workspace'}"
							</span>
							.
						</div>
						<div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
							<AlertTriangle
								className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
								aria-hidden="true"
							/>
							<span className="text-sm text-amber-800 dark:text-amber-200">
								Cette action va recharger l'application pour synchroniser toutes les données.
							</span>
						</div>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isLoading}
						className="mt-2 sm:mt-0"
						aria-label="Annuler le changement de workspace"
					>
						Annuler
					</Button>
					<Button
						onClick={onConfirm}
						disabled={isLoading}
						className="min-w-[140px]"
						aria-label={`Confirmer le changement vers ${targetWorkspace?.name}`}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
								Changement...
							</>
						) : (
							'Confirmer le changement'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export function WorkspacesSwitcher() {
	const { isMobile } = useSidebar();

	// Use the new hooks
	const { workspaces, currentWorkspace, error } = useWorkspaces();

	const { switchToWorkspace, isSwitching, canSwitchToWorkspace, clearError } = useWorkspaceSwitcher();

	// Modal state for workspace switch confirmation
	const { isOpen: isConfirmModalOpen, openModal: openConfirmModal, closeModal: closeConfirmModal } = useModal();
	const [targetWorkspace, setTargetWorkspace] = React.useState<TWorkspace | null>(null);

	// Fallback to legacy data if the new data is not available
	const activeWorkspace = workspaces.find((workspace) => workspace.isDefault);

	// Get available workspaces (excluding current one) for keyboard shortcuts
	const availableWorkspaces = React.useMemo(() => {
		return workspaces.filter((workspace) => workspace.id !== currentWorkspace?.id);
	}, [workspaces, currentWorkspace?.id]);

	// Handling clicks on workspaces - now shows confirmation modal
	const handleWorkspaceClick = React.useCallback(
		(workspaceId: string) => {
			if (isSwitching || !canSwitchToWorkspace(workspaceId)) {
				return;
			}

			// Find the target workspace
			const workspace = workspaces.find((w) => w.id === workspaceId);
			if (!workspace) {
				return;
			}

			// Clear previous errors
			if (error) {
				clearError();
			}

			// Set target workspace and open confirmation modal
			setTargetWorkspace(workspace);
			openConfirmModal();
		},
		[isSwitching, canSwitchToWorkspace, workspaces, error, clearError, setTargetWorkspace, openConfirmModal]
	);

	// Handle confirmed workspace switch
	const handleConfirmWorkspaceSwitch = React.useCallback(async () => {
		if (!targetWorkspace) {
			return;
		}

		try {
			await switchToWorkspace(targetWorkspace.id);
			// Modal will be closed automatically on success via the effect or component unmount
		} catch (error) {
			// Error handling is managed by the switchToWorkspace function
			console.error('Error switching workspace:', error);
		}
	}, [targetWorkspace, switchToWorkspace]);

	// Handle modal close
	const handleCloseModal = React.useCallback(() => {
		closeConfirmModal();
		setTargetWorkspace(null);
	}, [closeConfirmModal, setTargetWorkspace]);

	// Keyboard shortcuts support (Cmd/Ctrl + 1-9)
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only handle shortcuts when no modal is open and not in input fields
			if (
				isConfirmModalOpen ||
				isSwitching ||
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement
			) {
				return;
			}

			// Check for Cmd (Mac) or Ctrl (Windows/Linux) + number key
			if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
				const keyNumber = parseInt(event.key);

				// Handle keys 1-9
				if (keyNumber >= 1 && keyNumber <= 9) {
					event.preventDefault();

					// Get the workspace at index (keyNumber - 1)
					const targetWorkspace = availableWorkspaces[keyNumber - 1];

					if (targetWorkspace && canSwitchToWorkspace(targetWorkspace.id)) {
						console.log(`Keyboard shortcut: Switching to workspace ${keyNumber} (${targetWorkspace.name})`);
						handleWorkspaceClick(targetWorkspace.id);
					} else if (targetWorkspace) {
						console.warn(`Cannot switch to workspace ${keyNumber} (${targetWorkspace.name})`);
					}
				}
			}
		};

		// Add event listener
		document.addEventListener('keydown', handleKeyDown);

		// Cleanup
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isConfirmModalOpen, isSwitching, availableWorkspaces, canSwitchToWorkspace, handleWorkspaceClick]);

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
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								disabled={isSwitching}
								aria-label={`Workspace actuel: ${currentWorkspace?.name || 'Aucun workspace'}. Cliquer pour changer de workspace`}
								aria-expanded={false}
								aria-haspopup="menu"
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
							aria-label="Liste des workspaces disponibles"
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
													role="menuitem"
													aria-label={`Changer vers le workspace ${workspace.name} avec ${workspace.teams.length} équipe${workspace.teams.length > 1 ? 's' : ''}`}
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
															{workspace.teams.length > 1 ? 's' : ''} • {totalMembers}{' '}
															member
															{totalMembers > 1 ? 's' : ''}
														</div>
													</div>
													<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
												</DropdownMenuItem>
											);
										})}
								</>
							)}

							{/* Fallback to legacy data - also exclude current workspace */}
							{workspaces.length === 0 && (
								<>
									{workspaces
										.filter((workspace) => workspace.id !== currentWorkspace?.id) // Exclude current workspace
										.map((workspace, index) => {
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

			{/* Workspace Switch Confirmation Modal */}
			<WorkspaceSwitchConfirmModal
				isOpen={isConfirmModalOpen}
				onClose={handleCloseModal}
				onConfirm={handleConfirmWorkspaceSwitch}
				targetWorkspace={targetWorkspace}
				currentWorkspace={currentWorkspace}
				isLoading={isSwitching}
			/>
		</>
	);
}
