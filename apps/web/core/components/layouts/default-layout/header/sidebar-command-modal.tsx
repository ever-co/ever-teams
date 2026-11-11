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
import { PALETTE_COMMAND_IDS, usePaletteShortcuts } from '@/core/hooks/keyboard/use-palette-shortcuts';
import { usePaletteRecent } from '@/core/hooks/keyboard/use-palette-recent';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import type { PaletteItem } from '@/core/lib/utils/palette-items';
import type { ShortcutHandler } from '@/core/stores/common/shortcuts';
import { InviteFormModal } from '../../../features/teams/invite-form-modal';
import { CreateProjectModal } from '../../../features/projects/create-project-modal';
import { CreateTeamModal } from '@/core/components/features/teams/create-team-modal';
import { PaletteTaskResults } from './palette-task-results';
import {
	PaletteConversationResults,
	PalettePageResults,
	PalettePeopleResults,
	PaletteProjectResults,
	PaletteRecentResults
} from './palette-entity-results';

// Definition of types to improve readability and security
type ShortcutAction = () => void;

interface CommandGroupConfig {
	id: string;
	heading: string;
	commands: CommandShortcutConfig[];
}

const ALL_GROUPS_TAB = 'all';
const TASKS_TAB = 'tasks';
const TEAMS_TAB = 'teams';
const PROJECTS_TAB = 'projects';
/** The tabs of the results the palette finds besides tasks (the saved-views feature, and Docs or Chat for theirs). */
const PEOPLE_TAB = 'people';
const PAGES_TAB = 'pages';
const CONVERSATIONS_TAB = 'conversations';
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

function showsResultsIn(tab: string, resultsTab: string) {
	return tab === ALL_GROUPS_TAB || tab === resultsTab;
}

function shortcutKeysOf(command: Pick<CommandShortcutConfig, 'shortcutDisplay' | 'shortcutKeys'>) {
	return command.shortcutKeys ?? Array.from(command.shortcutDisplay);
}

const navigationIcon = <ArrowUpRight aria-hidden="true" />;

const ClickableCommandItem: FC<{
	children: React.ReactNode;
	action: ShortcutAction;
	className?: string;
	keywords?: string[];
}> = ({ children, action, ...props }) => {
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

	// Close the palette and execute an action (which may open it again on one of its tabs: the "search" ones)
	const executeAction = useCallback(
		(action: ShortcutAction) => {
			setOpen(false);
			action();
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

	// The palette opened on one tab, its field empty (the registry's "search" commands).
	const openOnTab = useCallback(
		(tab: string) => {
			setSearch('');
			setActiveTab(tab);
			setOpen(true);
		},
		[setOpen]
	);

	// With the shortcut registry on, the keys of the palette's own commands are the registry's (rebindable); the
	// handlers of the ones only the palette can run are registered here. Create task, the team's tasks and Settings
	// are the layout's.
	const paletteHandlers = useMemo(() => {
		const handlers: Record<string, ShortcutHandler> = {
			themeToggle: actions.toggleTheme,
			projectCreate: actions.createProject,
			searchTasks: () => openOnTab(TASKS_TAB),
			searchProjects: () => openOnTab(PROJECTS_TAB),
			searchTeams: () => openOnTab(TEAMS_TAB),
			goHome: actions.navigateToHome,
			goProjects: actions.navigateToProjects,
			goKanban: actions.navigateToKanban,
			goProfile: actions.navigateToProfile,
			goTimesheets: actions.navigateToTimesheetsReport,
			goWeeklyLimit: actions.navigateToWeeklyLimitReport,
			goTimeActivity: actions.navigateToTimeAndActivityReport
		};
		if (canInvite) handlers['inviteUser'] = actions.inviteUser;
		if (!publicTeam) handlers['teamCreate'] = actions.createTeam;
		return handlers;
	}, [actions, canInvite, openOnTab, publicTeam]);
	const paletteShortcuts = usePaletteShortcuts(paletteHandlers);
	const { keysOf, searchWordsOf, handlerOfTypedSequence } = paletteShortcuts;
	const registryOn = paletteShortcuts.isOn;

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
									commandId: PALETTE_COMMAND_IDS.inviteUser,
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
						commandId: PALETTE_COMMAND_IDS.toggleTheme,
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
						commandId: PALETTE_COMMAND_IDS.createTask,
						description: t('commandPalette.commands.createTask'),
						shortcutDisplay: 'CT',
						action: actions.createTask,
						icon: <AddTaskIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: [],
						commandId: PALETTE_COMMAND_IDS.searchTasks,
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
						commandId: PALETTE_COMMAND_IDS.createTeam,
						description: t('commandPalette.commands.createTeam'),
						shortcutDisplay: '⌘CT',
						action: actions.createTeam,
						icon: <AddTeamIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.searchTeams,
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
						commandId: PALETTE_COMMAND_IDS.createProject,
						description: t('commandPalette.commands.createProject'),
						shortcutDisplay: 'CP',
						action: actions.createProject,
						icon: <AddIcon />
					},
					{
						sequence: ['s', 'p'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.searchProjects,
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
						commandId: PALETTE_COMMAND_IDS.goToMyTasks,
						description: t('commandPalette.commands.goToMyTasks'),
						shortcutDisplay: '⌘MT',
						action: actions.navigateToMyTasks,
						icon: navigationIcon
					},
					{
						sequence: ['t', 't'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToTeamTasks,
						description: t('commandPalette.commands.goToTeamTasks'),
						shortcutDisplay: '⌘TT',
						action: actions.navigateToMyTeamsTasks,
						icon: navigationIcon
					},
					{
						sequence: ['t', 'p'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToProjects,
						description: t('commandPalette.commands.goToProjects'),
						shortcutDisplay: '⌘TP',
						action: actions.navigateToProjects,
						icon: navigationIcon
					},
					{
						sequence: ['k'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToKanban,
						description: t('commandPalette.commands.goToKanban'),
						shortcutDisplay: '⌘K',
						action: actions.navigateToKanban,
						icon: navigationIcon
					},
					{
						sequence: ['h'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToHome,
						description: t('commandPalette.commands.goToHome'),
						shortcutDisplay: '⌘H',
						action: actions.navigateToHome,
						icon: navigationIcon
					},
					{
						sequence: ['t', 's'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToTimesheets,
						description: t('commandPalette.commands.goToTimesheets'),
						shortcutDisplay: '⌘TS',
						action: actions.navigateToTimesheetsReport,
						icon: navigationIcon
					},
					{
						sequence: ['w', 'l'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToWeeklyLimit,
						description: t('commandPalette.commands.goToWeeklyLimit'),
						shortcutDisplay: '⌘WL',
						action: actions.navigateToWeeklyLimitReport,
						icon: navigationIcon
					},
					{
						sequence: ['t', 'a'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.goToTimeAndActivity,
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
						commandId: PALETTE_COMMAND_IDS.profile,
						description: t('commandPalette.commands.profile'),
						shortcutDisplay: '⌘P',
						action: actions.navigateToProfile,
						icon: <ProfileIcon />
					},
					{
						sequence: ['s'],
						modifiers: ['ctrl'],
						commandId: PALETTE_COMMAND_IDS.settings,
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

	// With the registry on, every entry shows its command's binding in force (none when nobody can run it now) and is
	// also found by it (`g t`, `gt`); off, the palette's own keys as they always were.
	const shownGroups = useMemo(() => {
		if (!registryOn) {
			return commandGroups;
		}
		// An entry runs what its keys run: the "search" ones open the palette on their tab instead of only closing it.
		const handlerOf = (commandId: string | undefined) => (commandId ? paletteHandlers[commandId] : undefined);
		return commandGroups.map((group) => ({
			...group,
			commands: group.commands.map((command) => ({
				...command,
				action: handlerOf(command.commandId) ?? command.action,
				shortcutKeys: keysOf(command.commandId),
				keywords: searchWordsOf(command.commandId)
			}))
		}));
	}, [commandGroups, keysOf, paletteHandlers, registryOn, searchWordsOf]);

	// Extract all shortcut configurations for the global hook: with the registry on, none (its listener has the
	// keys of every entry, rebinding included, and never runs one twice).
	const allShortcuts = useMemo(() => {
		if (registryOn) {
			return [];
		}
		const shortcuts: CommandShortcutConfig[] = [];
		commandGroups.forEach((group) => {
			group.commands.forEach((command) => shortcuts.push(command));
		});
		return shortcuts;
	}, [commandGroups, registryOn]);

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

	// With the saved-views feature: people, projects, and the pages and conversations where Docs and Chat are on.
	const showsPeople = registryOn;
	const showsPages = registryOn && isDocsEnabled();
	const showsConversations = registryOn && isChatEnabled();

	const tabs = useMemo(() => {
		const result: Array<{ value: string; label: string }> = [
			{ value: ALL_GROUPS_TAB, label: t('commandPalette.tabs.all') },
			...commandGroups.map((group) => ({ value: group.id, label: group.heading }))
		];
		if (showsPeople) result.push({ value: PEOPLE_TAB, label: t('commandPalette.results.people') });
		if (showsPages) result.push({ value: PAGES_TAB, label: t('commandPalette.results.pages') });
		if (showsConversations) {
			result.push({ value: CONVERSATIONS_TAB, label: t('commandPalette.results.conversations') });
		}
		return result;
	}, [commandGroups, showsConversations, showsPages, showsPeople, t]);

	const visibleGroups = groupsForTab(shownGroups, activeTab);
	const showsTaskResults = showsTaskResultsIn(activeTab);
	const hasSearch = search.trim().length > 0;

	const { items: recentItems, remember } = usePaletteRecent();
	// A page or a conversation opened while Docs or Chat was on leads nowhere once it is off: not listed then (kept).
	const shownRecentItems = useMemo(
		() =>
			recentItems.filter(
				(item) => (item.kind !== 'page' || showsPages) && (item.kind !== 'conversation' || showsConversations)
			),
		[recentItems, showsConversations, showsPages]
	);

	const openItem = useCallback(
		(item: PaletteItem) => {
			if (registryOn) remember(item);
			router.push(item.href);
			setOpen(false);
		},
		[registryOn, remember, router, setOpen]
	);

	const openTask = useCallback(
		(taskId: string, title: string) => {
			if (registryOn) remember({ kind: 'task', id: taskId, title, href: `/task/${taskId}` });
			router.push(`/task/${taskId}`);
			setOpen(false);
		},
		[registryOn, remember, router, setOpen]
	);

	// A sequence typed into the field (`g t`) runs its command, as its keys would outside the palette.
	const changeSearch = useCallback(
		(value: string) => {
			const handler = handlerOfTypedSequence(value);
			if (!handler) {
				setSearch(value);
				return;
			}
			setSearch('');
			setOpen(false);
			handler();
		},
		[handlerOfTypedSequence, setOpen]
	);

	// Rendering of command groups from the configuration
	const renderCommandGroups = () => {
		return visibleGroups.map((group) => (
			<CommandGroup key={group.id} heading={group.heading} className={paletteGroupClass}>
				{group.commands.map((command, commandIndex) => (
					<ClickableCommandItem
						key={`${group.id}-${commandIndex}`}
						className={paletteActionRowClass}
						keywords={command.keywords}
						action={() => {
							executeAction(command.action);
						}}
					>
						<span className={commandIconTileClass}>{command.icon}</span>
						<span className="min-w-0 flex-1 truncate">{command.description}</span>
						<CommandShortcut>
							{shortcutKeysOf(command).map((key, keyIndex) => (
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
					onValueChange={changeSearch}
				/>
				<CommandList
					tabs={tabs}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					tabsLabel={t('commandPalette.tabsLabel')}
				>
					<CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
					{registryOn && !hasSearch && activeTab === ALL_GROUPS_TAB && (
						<PaletteRecentResults items={shownRecentItems} onOpen={openItem} className={paletteGroupClass} />
					)}
					{showsTaskResults && (
						<PaletteTaskResults search={search} onOpenTask={openTask} className={paletteGroupClass} />
					)}
					{hasSearch && showsPeople && showsResultsIn(activeTab, PEOPLE_TAB) && (
						<PalettePeopleResults search={search} onOpen={openItem} className={paletteGroupClass} />
					)}
					{hasSearch && registryOn && showsResultsIn(activeTab, PROJECTS_TAB) && (
						<PaletteProjectResults search={search} onOpen={openItem} className={paletteGroupClass} />
					)}
					{hasSearch && showsPages && showsResultsIn(activeTab, PAGES_TAB) && (
						<PalettePageResults search={search} onOpen={openItem} className={paletteGroupClass} />
					)}
					{hasSearch && showsConversations && showsResultsIn(activeTab, CONVERSATIONS_TAB) && (
						<PaletteConversationResults search={search} onOpen={openItem} className={paletteGroupClass} />
					)}
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
