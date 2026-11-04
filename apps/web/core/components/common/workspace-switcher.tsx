'use client';
import * as React from 'react';
import { Alert, ChevronsUpDown, Plus, Spinner, Timer } from '@/core/components/icons';
import { SelectedMark } from './selected-mark';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/core/components/common/sidebar';
import { useWorkspaces, useWorkspaceSwitcher } from '@/core/hooks/auth';
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
import { APP_NAME } from '@/core/constants/config/constants';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';
import { EntityTile } from './entity-tile';
import { commandKeycapClass } from './command';
import { cn } from '@/core/lib/helpers';

const WORKSPACE_SWITCH_BLOCKED_TOAST_ID = 'workspace-switch-blocked-timer-running';

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
	const t = useTranslations();

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="sm:max-w-md"
				aria-labelledby="workspace-switch-title"
				aria-describedby="workspace-switch-description"
			>
				<DialogHeader>
					<DialogTitle id="workspace-switch-title" className="flex gap-2 items-center">
						<Alert className="size-5 text-warning-foreground" aria-hidden="true" />
						{t('common.WORKSPACE_SWITCH_CONFIRM_TITLE')}
					</DialogTitle>
					<DialogDescription id="workspace-switch-description" className="space-y-3">
						<div className="text-sm text-muted-foreground">
							{t('common.WORKSPACE_SWITCH_CONFIRM_DESCRIPTION', {
								currentWorkspace: currentWorkspace?.user.tenant.name ?? t('common.CURRENT_WORKSPACE'),
								targetWorkspace: targetWorkspace?.user.tenant.name ?? t('common.TARGET_WORKSPACE')
							})}
						</div>
						<div className="flex items-center gap-3 rounded-lg bg-warning/10 p-3">
							<Alert className="size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
							<span className="text-sm text-warning-foreground">
								{t('common.WORKSPACE_SWITCH_CONFIRM_WARNING')}
							</span>
						</div>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:gap-2">
					<Button
						variant="outline"
						size="lg"
						onClick={onClose}
						disabled={isLoading}
						className="mt-2 sm:mt-0"
						aria-label={t('common.WORKSPACE_SWITCH_CANCEL_ARIA')}
					>
						{t('common.CANCEL')}
					</Button>
					<Button
						size="lg"
						onClick={onConfirm}
						disabled={isLoading}
						className="min-w-[140px]"
						aria-label={t('common.WORKSPACE_SWITCH_CONFIRM_ARIA', {
							workspace: targetWorkspace?.user.tenant.name ?? ''
						})}
					>
						{isLoading ? (
							<>
								<Spinner className="mr-2 size-4 animate-spin" aria-hidden="true" />
								{t('common.WORKSPACE_SWITCH_CHANGING')}
							</>
						) : (
							t('common.WORKSPACE_SWITCH_CONFIRM_BUTTON')
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
				className="flex aspect-square size-6 animate-pulse items-center justify-center rounded-md bg-foreground/5"
				aria-hidden="true"
				role="presentation"
			>
				<div className="size-4 animate-pulse rounded-sm bg-foreground/5" />
			</div>

			{/* Text content skeleton - matches exact layout and dimensions */}
			<div className="grid flex-1 space-y-1 text-sm leading-tight text-left" role="presentation">
				{/* Main title skeleton */}
				<div
					className="h-5 animate-pulse rounded-md bg-foreground/5"
					style={{ width: '70%' }}
					aria-hidden="true"
				/>
				{/* Subtitle skeleton */}
				<div
					className="h-3 animate-pulse rounded-md bg-foreground/5"
					style={{ width: '40%' }}
					aria-hidden="true"
				/>
			</div>
		</>
	);
};

export function WorkspacesSwitcher() {
	const { isMobile } = useSidebar();
	const t = useTranslations();

	// Use the new hooks with comprehensive state management
	const {
		workspaces,
		currentWorkspace,
		isLoading: workspacesLoading,
		isInitialized: workspacesInitialized,
		workspacesQuery
	} = useWorkspaces();

	// Use the smart workspace switcher hook (based on password component logic)
	const { switchToWorkspace, isLoading: isSwitching } = useWorkspaceSwitcher();

	// Timer protection logic - similar to teams-dropdown.tsx
	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = React.useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);

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
	const availableWorkspaces = React.useMemo(() => {
		return workspaces.filter(
			(w) => w.current_teams.length > 0 && w.user.tenant.id !== actualCurrentWorkspace?.user.tenant.id
		);
	}, [workspaces, actualCurrentWorkspace]);

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
			// Prevent workspace switching when timer is running
			if (timerRunningStatus) {
				toast.warning(t('common.WORKSPACE_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), {
					id: WORKSPACE_SWITCH_BLOCKED_TOAST_ID
				});
				return;
			}

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
		[timerRunningStatus, t, isSwitching, canSwitchToWorkspace, workspaces, openConfirmModal]
	);

	// Handle confirmed workspace switch
	const handleConfirmWorkspaceSwitch = React.useCallback(async () => {
		if (!targetWorkspace) {
			return;
		}

		// Switch to workspace to another
		// NOTE: Do NOT close modal or reset state here!
		// The page will reload via window.location.href, so any state cleanup is unnecessary
		switchToWorkspace(targetWorkspace);
	}, [targetWorkspace, switchToWorkspace]);

	// Handle modal close
	const handleCloseModal = React.useCallback(() => {
		closeConfirmModal();
		setTargetWorkspace(null);
	}, [closeConfirmModal, setTargetWorkspace]);

	const hasNoOtherWorkspace = workspaces.length > 0 && availableWorkspaces.length === 0;
	let menuSide: 'bottom' | 'right' = 'right';
	if (isMobile) {
		menuSide = 'bottom';
	}

	// Determine loading state with comprehensive logic
	const isWorkspaceLoading = React.useMemo(() => {
		// Check if we're in initial loading state
		const isInitialLoading = workspacesLoading && !workspacesInitialized;

		// We're loading if any of these conditions are true
		return isInitialLoading || workspacesQuery.isLoading || isSwitching;
	}, [workspacesLoading, workspacesInitialized, workspacesQuery.isLoading, isSwitching]);

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
					<EntityTile
						name={actualCurrentWorkspace.user.tenant.name}
						imageUrl={actualCurrentWorkspace.user.tenant.logo}
						className="size-7"
					/>
					<div className="grid flex-1 text-sm leading-tight text-left group-data-[collapsible=icon]:hidden">
						<span className="font-semibold truncate">{actualCurrentWorkspace.user.tenant.name}</span>
						{actualCurrentWorkspace.current_teams.length > 0 && (
							<span className="text-xs text-muted-foreground">
								{t('switchers.TEAM_COUNT', { count: actualCurrentWorkspace.current_teams.length })}
							</span>
						)}
					</div>
				</>
			);
		}

		// Final fallback - default workspace display
		return (
			<>
				<div className="flex aspect-square size-6 items-center justify-center rounded-md bg-foreground/5 text-foreground">
					<DefaultWorkspaceIcon className="!size-6" />
				</div>
				<div className="grid flex-1 text-sm leading-tight text-left group-data-[collapsible=icon]:hidden">
					<span className="font-semibold truncate">{APP_NAME}</span>
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
						<Tooltip
							label={t('common.WORKSPACE_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
							placement="top"
							enabled={timerRunningStatus}
						>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className={`data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:justify-center ${
										timerRunningStatus ? 'opacity-50 cursor-not-allowed' : ''
									}`}
									disabled={isSwitching || isWorkspaceLoading || timerRunningStatus}
									aria-label={
										isWorkspaceLoading
											? 'Loading workspace information...'
											: timerRunningStatus
												? t('common.WORKSPACE_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')
												: `Current workspace: ${actualCurrentWorkspace?.user.tenant.name || 'No workspace'}. Click to change the workspace`
									}
									aria-haspopup="menu"
									aria-busy={isWorkspaceLoading}
								>
									{renderActiveWorkspace()}
									{isSwitching ? (
										<Spinner className="ml-auto size-4 animate-spin text-muted-foreground group-data-[collapsible=icon]:hidden" />
									) : (
										<ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
									)}
								</SidebarMenuButton>
							</DropdownMenuTrigger>
						</Tooltip>
						<DropdownMenuContent className="w-72" align="start" side={menuSide} sideOffset={6}>
							{timerRunningStatus && (
								<div className="mx-1 mb-1 flex items-start gap-2 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-warning-foreground">
									<Timer className="mt-px size-3.5 shrink-0" aria-hidden="true" />
									<span>{t('common.WORKSPACE_SWITCH_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}</span>
								</div>
							)}

							<DropdownMenuLabel>{t('switchers.WORKSPACES')}</DropdownMenuLabel>

							{actualCurrentWorkspace && (
								<DropdownMenuItem className="h-9 gap-2.5">
									<EntityTile
										name={actualCurrentWorkspace.user.tenant.name}
										imageUrl={actualCurrentWorkspace.user.tenant.logo}
									/>
									<span className="min-w-0 flex-1 truncate">
										{actualCurrentWorkspace.user.tenant.name}
									</span>
									<WorkspaceTeamCount count={actualCurrentWorkspace.current_teams.length} />
									<SelectedMark />
								</DropdownMenuItem>
							)}

							{availableWorkspaces.map((workspace) => (
								<DropdownMenuItem
									key={workspace.user.tenant.id}
									onClick={() => handleWorkspaceClick(workspace.user.tenant.id)}
									disabled={isSwitching || timerRunningStatus}
									className="h-9 gap-2.5"
								>
									<EntityTile
										name={workspace.user.tenant.name}
										imageUrl={workspace.user.tenant.logo}
									/>
									<span className="min-w-0 flex-1 truncate">{workspace.user.tenant.name}</span>
									<WorkspaceTeamCount count={workspace.current_teams.length} />
									<span className="size-4 shrink-0" aria-hidden="true" />
								</DropdownMenuItem>
							))}

							{hasNoOtherWorkspace && (
								<p className="px-2 py-1.5 text-xs text-muted-foreground">
									{t('switchers.NO_OTHER_WORKSPACE')}
								</p>
							)}

							<DropdownMenuSeparator />
							<DropdownMenuItem disabled className="h-8">
								<Plus />
								<span>{t('switchers.ADD_WORKSPACE')}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			{/* Workspace Switch Confirmation Modal */}
			{isConfirmModalOpen && !timerRunningStatus && (
				<Suspense fallback={<ModalSkeleton />}>
					<WorkspaceSwitchConfirmModal
						isOpen={true}
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

/** The number of teams of a workspace as a key cap (the palette's), its full wording kept for the tooltip. */
function WorkspaceTeamCount({ count }: Readonly<{ count: number }>) {
	const t = useTranslations();
	return (
		<span className={cn(commandKeycapClass, 'tabular-nums')} title={t('switchers.TEAM_COUNT', { count })}>
			{count}
		</span>
	);
}
