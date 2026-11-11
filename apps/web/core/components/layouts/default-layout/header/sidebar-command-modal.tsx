'use client';
import * as React from 'react';
import { FC, useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { commandPaletteOpenAtom } from '@/core/stores/common/command-palette';
import { useRouter } from 'next/navigation';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
	commandIconTileClass,
	commandKeycapClass
} from '@/core/components/common/command';
import { SidebarCommandForm } from './sidebar-command-form';
import {
	AddIcon,
	AddTaskIcon,
	AddTeamIcon,
	AddUserIcon,
	DashboardIcon,
	MoonIcon,
	ProfileIcon,
	SettingsIcon,
	TasksIcon,
	TeamIcon,
	UserCircleIcon
} from '../../../icons';
import { useAuthenticateUser } from '../../../../hooks/auth';
import { useModal } from '../../../../hooks';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { useTranslations } from 'next-intl';
import { Modal } from '../../../common/modal';
import CreateTaskModal from '../../../features/tasks/create-task-modal';

import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { ArrowUpRight } from '@/core/components/icons/hugeicons';
import { useKeyboardShortcuts, CommandShortcutConfig } from '@/core/hooks/common/use-keyboard-shortcuts';
import { useGoToCommands } from '@/core/hooks/keyboard/use-go-to-commands';
import { REGISTRY_OWNED_MOD_KEYS } from '@/core/lib/keyboard/shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { InviteFormModal } from '../../../features/teams/invite-form-modal';
import { CreateProjectModal } from '../../../features/projects/create-project-modal';
import { CreateTeamModal } from '@/core/components/features/teams/create-team-modal';
import { PaletteDocsResults } from './palette-docs-results';
import { PaletteTaskResults } from './palette-task-results';

// Definition of types to improve readability and security
type ShortcutAction = () => void;

interface CommandGroupConfig {
	id: string;
	heading: string;
	commands: CommandShortcutConfig[];
}

const ALL_GROUPS_TAB = 'all';
const TASKS_TAB = 'tasks';
const PALETTE_SHORTCUT_KEYS = ['⌘', 'K'];
const paletteGroupClass =
	'p-0 pt-1 [&_[cmdk-group-heading]]:h-8 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-[13px]';
const paletteActionRowClass = 'min-h-10 gap-3 rounded-lg px-2 text-sm';

function groupsForTab(groups: CommandGroupConfig[], tab: string) {
	if (tab === ALL_GROUPS_TAB) {
		return groups;
	}
	return groups.filter((group) => group.id === tab);
}

function showsTaskResultsIn(tab: string) {
	return tab === ALL_GROUPS_TAB || tab === TASKS_TAB;
}

function shortcutKeysOf(shortcutDisplay: string) {
	return Array.from(shortcutDisplay);
}

const navigationIcon = <ArrowUpRight aria-hidden="true" />;

const ClickableCommandItem: FC<{ children: React.ReactNode; action: ShortcutAction; className?: string }> = ({
	children,
	action,
	...props
}) => {
	const handleClick = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			// Prevent propagation and default behavior
			event.stopPropagation();
			event.preventDefault();

			// Execute the action
			if (typeof action === 'function') {
				action();
			}
		},
		[action]
	);

	return (
		// outer div to reliably capture clicks
		<div onClick={handleClick} className="w-full cursor-pointer">
			<CommandItem
				onSelect={() => {
					// CommandItem can also use onSelect
					if (typeof action === 'function') {
						action();
					}
				}}
				{...props}
			>
				{children}
			</CommandItem>
		</div>
	);
};
/**
 * The command palette.
 * `variant="sidebar"` renders the original full-width input as its trigger; `variant="none"` renders no
 * trigger: the shell mounts it once that way (app-sidebar.tsx) so its shortcuts work on every page, and
 * the header's CommandPaletteTrigger opens it through `commandPaletteOpenAtom`.
 */
export const SidebarCommandModal: FC<{ publicTeam: boolean; variant?: 'sidebar' | 'none' }> = ({
	publicTeam,
	variant = 'sidebar'
}) => {
	const [open, setOpen] = useAtom(commandPaletteOpenAtom);

	const t = useTranslations();
	const [activeTab, setActiveTab] = useState(ALL_GROUPS_TAB);
	const [search, setSearch] = useState('');
	const [lastOpen, setLastOpen] = useState(open);
	const { user } = useAuthenticateUser();
	// The API refuses an invitation into a team the user does not manage (403): offer "Invite User", and its
	// key sequence, only to who may send it.
	const canInvite = useCanInviteToActiveTeam();
	const { setTheme, resolvedTheme } = useTheme();
	const name = user?.name || user?.firstName || user?.lastName || user?.username;
	const profileLink = `/profile/${user?.id}?name=${name || ''}`;
	const timesheetLink = `/reports/timesheet/${user?.id}?name=${encodeURIComponent(name || '')}`;
	const router = useRouter();

	// Custom hooks for modals
	const teamModal = useModal();
	const inviteModal = useModal();
	const createTaskModal = useModal();
	const createProjectModal = useModal();

	// Close the palette and execute an action
	const executeAction = useCallback(
		(action: ShortcutAction) => {
			action();
			setOpen(false);
		},
		[setOpen]
	);

	// Reusable actions
	const actions = useMemo(
		() => ({
			navigateToProfile: () => router.push(profileLink),
			navigateToSettings: () => router.push('/settings/personal'),
			navigateToSearchTasks: () => console.log('Searching tasks'),
			navigateToSearchTeams: () => console.log('Searching teams'),
			navigateToSearchProjects: () => console.log('Searching projects'),
			navigateToTimesheetsReport: () => router.push(timesheetLink),
			navigateToWeeklyLimitReport: () => router.push('/reports/weekly-limit'),
			navigateToTimeAndActivityReport: () => router.push('/reports/time-and-activity'),
			navigateToMyTasks: () => router.push(profileLink),
			navigateToMyTeamsTasks: () => router.push('/team/tasks'), // the route is /team/tasks (`/teams/tasks` 404'd)
			navigateToProjects: () => router.push('/projects'),
			navigateToKanban: () => router.push('/kanban'),
			navigateToHome: () => router.push('/'),
			assignToMe: () => console.log('Assigning to me'),
			createTask: () => createTaskModal.openModal(),
			createTeam: () => teamModal.openModal(),
			createProject: () => createProjectModal.openModal(),
			inviteUser: () => inviteModal.openModal(),
			toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
		}),
		[router, profileLink, createTaskModal, teamModal, createProjectModal, inviteModal, setTheme, resolvedTheme]
	);

	// The registry's "go to" commands (saved-views feature): their keys are the registry's, not this palette's.
	const goToCommands = useGoToCommands(navigationIcon);

	// Centralized configuration of commands and shortcuts
	const commandGroups: CommandGroupConfig[] = useMemo(
		() => [
			{
				id: 'suggestions',
				heading: t('commandPalette.groups.suggestions'),
				commands: [
					...(canInvite
						? [
								{
									sequence: ['i', 'u'],
									description: t('commandPalette.commands.inviteUser'),
									shortcutDisplay: 'IU',
									action: actions.inviteUser,
									icon: <AddUserIcon />
								}
							]
						: []),

					{
						sequence: ['a', 'm'],
						description: t('commandPalette.commands.assignToMe'),
						shortcutDisplay: 'AM',
						action: actions.assignToMe,
						icon: <UserCircleIcon />
					},
					{
						sequence: ['t', 'h'],
						description: t('commandPalette.commands.toggleTheme'),
						shortcutDisplay: 'TH',
						action: actions.toggleTheme,
						icon: <MoonIcon />
					}
				]
			},
			{
				id: 'tasks',
				heading: t('commandPalette.groups.tasks'),
				commands: [
					{
						sequence: ['c', 't'],
						modifiers: [],
						description: t('commandPalette.commands.createTask'),
						shortcutDisplay: 'CT',
						action: actions.createTask,
						icon: <AddTaskIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: [],
						description: t('commandPalette.commands.searchTasks'),
						shortcutDisplay: 'ST',
						action: actions.navigateToSearchTasks,
						icon: <TasksIcon />
					}
				]
			},
			{
				id: 'teams',
				heading: t('commandPalette.groups.teams'),
				commands: [
					{
						sequence: ['c', 't'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.createTeam'),
						shortcutDisplay: '⌘CT',
						action: actions.createTeam,
						icon: <AddTeamIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.searchTeams'),
						shortcutDisplay: '⌘ST',
						action: actions.navigateToSearchTeams,
						icon: <TeamIcon />
					}
				]
			},
			{
				id: 'projects',
				heading: t('commandPalette.groups.projects'),
				commands: [
					{
						sequence: ['c', 'p'],
						description: t('commandPalette.commands.createProject'),
						shortcutDisplay: 'CP',
						action: actions.createProject,
						icon: <AddIcon />
					},
					{
						sequence: ['s', 'p'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.searchProjects'),
						shortcutDisplay: '⌘SP',
						action: actions.navigateToSearchProjects,
						icon: <DashboardIcon />
					}
				]
			},

			{
				id: 'navigation',
				heading: t('commandPalette.groups.navigation'),
				commands: [
					{
						sequence: ['m', 't'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToMyTasks'),
						shortcutDisplay: '⌘MT',
						action: actions.navigateToMyTasks,
						icon: navigationIcon
					},
					{
						sequence: ['t', 't'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToTeamTasks'),
						shortcutDisplay: '⌘TT',
						action: actions.navigateToMyTeamsTasks,
						icon: navigationIcon
					},
					{
						sequence: ['t', 'p'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToProjects'),
						shortcutDisplay: '⌘TP',
						action: actions.navigateToProjects,
						icon: navigationIcon
					},
					{
						sequence: ['k'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToKanban'),
						shortcutDisplay: '⌘K',
						action: actions.navigateToKanban,
						icon: navigationIcon
					},
					{
						sequence: ['h'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToHome'),
						shortcutDisplay: '⌘H',
						action: actions.navigateToHome,
						icon: navigationIcon
					},
					{
						sequence: ['t', 's'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToTimesheets'),
						shortcutDisplay: '⌘TS',
						action: actions.navigateToTimesheetsReport,
						icon: navigationIcon
					},
					{
						sequence: ['w', 'l'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToWeeklyLimit'),
						shortcutDisplay: '⌘WL',
						action: actions.navigateToWeeklyLimitReport,
						icon: navigationIcon
					},
					{
						sequence: ['t', 'a'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.goToTimeAndActivity'),
						shortcutDisplay: '⌘TA',
						action: actions.navigateToTimeAndActivityReport,
						icon: navigationIcon
					}
				]
			},
			...(goToCommands.length ? [{ id: 'goTo', heading: t('commandPalette.groups.goTo'), commands: goToCommands }] : []),
			{
				id: 'settings',
				heading: t('commandPalette.groups.settings'),
				commands: [
					{
						sequence: ['p'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.profile'),
						shortcutDisplay: '⌘P',
						action: actions.navigateToProfile,
						icon: <ProfileIcon />
					},
					{
						sequence: ['s'],
						modifiers: ['ctrl'],
						description: t('commandPalette.commands.settings'),
						shortcutDisplay: '⌘S',
						action: actions.navigateToSettings,
						icon: <SettingsIcon />
					}
				]
			}
		],
		[actions, canInvite, goToCommands, t]
	);

	// Extract all shortcut configurations for the global hook
	const allShortcuts = useMemo(() => {
		const shortcuts: CommandShortcutConfig[] = [];
		// With the registry on, the ⌘/Ctrl chords it owns (K, S, ,) are its to handle, rebinding included.
		const registryOn = isTaskViewsEnabled();
		commandGroups.forEach((group) => {
			if (group.id === 'goTo') return; // bound by the shortcut registry's listener, never twice
			group.commands.forEach((command) => {
				const isOwnedByRegistry =
					registryOn && command.sequence.length === 1 && !!command.modifiers?.includes('ctrl') && REGISTRY_OWNED_MOD_KEYS.has(command.sequence[0]);
				if (isOwnedByRegistry) return;
				shortcuts.push(command);
			});
		});
		return shortcuts;
	}, [commandGroups]);

	// Use our global keyboard shortcut hook (the registry opens the palette itself while it is on)
	const registryOwnsPalette = isTaskViewsEnabled();
	useKeyboardShortcuts(allShortcuts, registryOwnsPalette ? undefined : setOpen);

	// Keyboard shortcut in current component only for Ctrl+K
	React.useEffect(() => {
		if (registryOwnsPalette) return;
		const down = (e: KeyboardEvent) => {
			const isToggleKey = e.key === 'k' && (e.metaKey || e.ctrlKey);
			if (isToggleKey) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, [registryOwnsPalette, setOpen]);

	if (open !== lastOpen) {
		setLastOpen(open);
		if (!open) {
			setActiveTab(ALL_GROUPS_TAB);
			setSearch('');
		}
	}

	const tabs = useMemo(() => {
		const groupTabs = commandGroups.map((group) => ({ value: group.id, label: group.heading }));
		return [{ value: ALL_GROUPS_TAB, label: t('commandPalette.tabs.all') }, ...groupTabs];
	}, [commandGroups, t]);

	const visibleGroups = groupsForTab(commandGroups, activeTab);
	const showsTaskResults = showsTaskResultsIn(activeTab);

	const openTask = useCallback(
		(taskId: string) => {
			router.push(`/task/${taskId}`);
			setOpen(false);
		},
		[router, setOpen]
	);

	const openPage = useCallback(
		(pageId: string) => {
			router.push(`/docs/${encodeURIComponent(pageId)}`);
			setOpen(false);
		},
		[router, setOpen]
	);

	// Rendering of command groups from the configuration
	const renderCommandGroups = () => {
		return visibleGroups.map((group) => (
			<CommandGroup key={group.id} heading={group.heading} className={paletteGroupClass}>
				{group.commands.map((command, commandIndex) => (
					<ClickableCommandItem
						key={`${group.id}-${commandIndex}`}
						className={paletteActionRowClass}
						action={() => {
							executeAction(command.action);
						}}
					>
						<span className={commandIconTileClass}>{command.icon}</span>
						<span className="min-w-0 flex-1 truncate">{command.description}</span>
						<CommandShortcut>
							{shortcutKeysOf(command.shortcutDisplay).map((key, keyIndex) => (
								<kbd key={`${command.shortcutDisplay}-${keyIndex}`} className={commandKeycapClass}>
									{key}
								</kbd>
							))}
						</CommandShortcut>
					</ClickableCommandItem>
				))}
			</CommandGroup>
		));
	};

	return (
		<>
			{variant === 'sidebar' ? <SidebarCommandForm onClick={() => setOpen(true)} /> : null}
			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput
					placeholder={t('commandPalette.searchPlaceholder')}
					shortcutKeys={PALETTE_SHORTCUT_KEYS}
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList
					tabs={tabs}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					tabsLabel={t('commandPalette.tabsLabel')}
				>
					<CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
					{showsTaskResults && (
						<PaletteTaskResults search={search} onOpenTask={openTask} className={paletteGroupClass} />
					)}
					{showsTaskResults && <PaletteDocsResults search={search} onOpenPage={openPage} className={paletteGroupClass} />}
					{renderCommandGroups()}
				</CommandList>
			</CommandDialog>

			{createPortal(
				<Modal isOpen={createTaskModal.isOpen} closeModal={createTaskModal.closeModal}>
					<CreateTaskModal
						onClose={createTaskModal.closeModal}
						title={t('common.CREATE_TASK')}
						initEditMode={false}
						task={null}
						tasks={[]}
					/>
				</Modal>,
				document.body
			)}
			{!publicTeam && (
				<CreateTeamModal open={teamModal.isOpen && !!user?.isEmailVerified} closeModal={teamModal.closeModal} />
			)}

			<InviteFormModal open={inviteModal.isOpen && !!user?.isEmailVerified} closeModal={inviteModal.closeModal} />
			<CreateProjectModal open={createProjectModal.isOpen} closeModal={createProjectModal.closeModal} />
		</>
	);
};
