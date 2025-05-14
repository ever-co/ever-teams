'use client';
import * as React from 'react';
import { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut
} from '@/core/components/ui/command';
import { SidebarCommandForm } from './sidebar-command-form';
import { Badge } from './ui/badge';
import {
	AddIcon,
	AddTaskIcon,
	AddTeamIcon,
	AddUserIcon,
	DashboardIcon,
	HomeIcon,
	MoonIcon,
	ProfileIcon,
	SettingsIcon,
	TasksIcon,
	TeamIcon,
	UserCircleIcon
} from './icons';
import { CreateTeamModal } from './features';
import { useAuthenticateUser } from '../hooks/auth';
import { useModal } from '../hooks';
import { useTranslations } from 'next-intl';
import { Modal } from './modal';
import CreateTaskModal from './pages/kanban/create-task-modal';
import { InviteFormModal } from './features/team/invite/invite-form-modal';
import { CreateProjectModal } from './features/project/create-project-modal';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { KanbanIcon } from 'lucide-react';

// Definition of types to improve readability and security
type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | null;
type ShortcutAction = () => void;

interface CommandShortcutConfig {
	sequence: string[];
	modifiers?: KeyModifier[];
	description: string;
	shortcutDisplay: string;
	action: ShortcutAction;
	icon: React.ReactNode;
}

interface CommandGroupConfig {
	heading: string;
	commands: CommandShortcutConfig[];
}
const ClickableCommandItem: FC<{ children: React.ReactNode; action: ShortcutAction }> = React.forwardRef(
	({ children, action, ...props }, ref) => {
		const handleClick = React.useCallback(
			(event: React.MouseEvent<HTMLDivElement>) => {
				// Prevent propagation and default behavior
				event.preventDefault();
				event.stopPropagation();

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
					ref={ref as React.RefObject<HTMLDivElement>}
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
	}
);
export const SidebarCommandModal: FC<{ publicTeam: boolean }> = ({ publicTeam }) => {
	const [open, setOpen] = useState(false);
	const [keySequence, setKeySequence] = useState<string[]>([]);
	const [keyTimeout, setKeyTimeout] = useState<NodeJS.Timeout | null>(null);

	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const { setTheme, resolvedTheme } = useTheme();
	const name = user?.name || user?.firstName || user?.lastName || user?.username;
	const profileLink = `/profile/${user?.id}?name=${name || ''}`;
	const router = useRouter();

	// Custom hooks for modals
	const teamModal = useModal();
	const inviteModal = useModal();
	const createTaskModal = useModal();
	const createProjectModal = useModal();

	// Close the palette and execute an action
	const executeAction = useCallback((action: ShortcutAction) => {
		action();
		setOpen(false);
	}, []);

	// Reusable actions
	const actions = useMemo(
		() => ({
			navigateToProfile: () => router.push(profileLink),
			navigateToSettings: () => router.push('/settings/personal'),
			navigateToSearchTasks: () => console.log('Searching tasks'),
			navigateToSearchTeams: () => console.log('Searching teams'),
			navigateToSearchProjects: () => console.log('Searching projects'),
			navigateToKanban: () => router.push('/kanban'),
			navigateToHome: () => router.push('/'),
			assignToMe: () => console.log('Assigning to me'),
			createTask: () => createTaskModal.openModal(),
			createTeam: () => inviteModal.openModal(),
			createProject: () => createProjectModal.openModal(),
			inviteUser: () => inviteModal.openModal(),
			toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
		}),
		[router, createTaskModal, inviteModal, createProjectModal]
	);

	// Centralized configuration of commands and shortcuts
	const commandGroups: CommandGroupConfig[] = useMemo(
		() => [
			{
				heading: 'Suggestions',
				commands: [
					{
						sequence: ['i', 'u'],
						description: 'Invite User',
						shortcutDisplay: 'IU',
						action: actions.inviteUser,
						icon: <AddUserIcon />
					},

					{
						sequence: ['a', 'm'],
						description: 'Assign to me',
						shortcutDisplay: 'AM',
						action: actions.assignToMe,
						icon: <UserCircleIcon />
					},
					{
						sequence: ['t', 'h'],
						description: 'Toggle Theme',
						shortcutDisplay: 'TH',
						action: actions.toggleTheme,
						icon: <MoonIcon />
					}
				]
			},
			{
				heading: 'Tasks',
				commands: [
					{
						sequence: ['c', 't'],
						modifiers: [],
						description: 'Create New Task',
						shortcutDisplay: 'CT',
						action: actions.createTask,
						icon: <AddTaskIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: [],
						description: 'Search Tasks',
						shortcutDisplay: 'ST',
						action: actions.navigateToSearchTasks,
						icon: <TasksIcon />
					}
				]
			},
			{
				heading: 'Teams',
				commands: [
					{
						sequence: ['c', 't'],
						modifiers: ['ctrl'],
						description: 'Create New Team',
						shortcutDisplay: '⌘CT',
						action: actions.createTeam,
						icon: <AddTeamIcon />
					},
					{
						sequence: ['s', 't'],
						modifiers: ['ctrl'],
						description: 'Search Teams',
						shortcutDisplay: '⌘ST',
						action: actions.navigateToSearchTeams,
						icon: <TeamIcon />
					}
				]
			},
			{
				heading: 'Projects',
				commands: [
					{
						sequence: ['c', 'p'],
						modifiers: ['ctrl'],
						description: 'Create New Project',
						shortcutDisplay: '⌘CP',
						action: actions.createProject,
						icon: <AddIcon />
					},
					{
						sequence: ['s', 'p'],
						modifiers: ['ctrl'],
						description: 'Search Projects',
						shortcutDisplay: '⌘SP',
						action: actions.navigateToSearchProjects,
						icon: <DashboardIcon />
					}
				]
			},

			{
				heading: 'Navigation',
				commands: [
					{
						sequence: ['k'],
						modifiers: ['ctrl'],
						description: 'Go to Kanban',
						shortcutDisplay: '⌘K',
						action: actions.navigateToKanban,
						icon: <KanbanIcon />
					},
					{
						sequence: ['h'],
						modifiers: ['ctrl'],
						description: 'Go to Home Page',
						shortcutDisplay: '⌘H',
						action: actions.navigateToHome,
						icon: <HomeIcon />
					}
				]
			},
			{
				heading: 'Settings',
				commands: [
					{
						sequence: ['p'],
						modifiers: ['ctrl'],
						description: 'Profile',
						shortcutDisplay: '⌘P',
						action: actions.navigateToProfile,
						icon: <ProfileIcon />
					},
					{
						sequence: ['s'],
						modifiers: ['ctrl'],
						description: 'Settings',
						shortcutDisplay: '⌘S',
						action: actions.navigateToSettings,
						icon: <SettingsIcon />
					}
				]
			}
		],
		[actions]
	);

	// Create a lookup map for shortcuts for more efficient O(1) search
	const shortcutMap = useMemo(() => {
		const map = new Map<string, ShortcutAction>();

		// Special shortcut for opening/closing the palette
		map.set('j|ctrl', () => setOpen((prev) => !prev));

		// Add all command shortcuts to the map
		commandGroups.forEach((group) => {
			group.commands.forEach((command) => {
				// Construction of the unique key for this shortcut
				const modifierString = command.modifiers?.length
					? command.modifiers.includes('ctrl')
						? '|ctrl'
						: ''
					: '';

				// Handling of unique key shortcuts
				if (command.sequence.length === 1) {
					map.set(`${command.sequence[0]}${modifierString}`, command.action);
				}
				// Handling of two-key sequences
				else if (command.sequence.length === 2) {
					map.set(`${command.sequence[0]}|${command.sequence[1]}${modifierString}`, command.action);
				}
			});
		});

		return map;
	}, [commandGroups]);

	// Optimized keyboard shortcut handler
	const handleKeyboardShortcut = useCallback(
		(e: KeyboardEvent) => {
			const modifier = e.metaKey || e.ctrlKey;
			const key = e.key.toLowerCase();
			const modifierString = modifier ? '|ctrl' : '';

			// Shortcut for opening/closing the palette
			const toggleKey = `j${modifierString}`;
			if (shortcutMap.has(toggleKey) && key === 'j' && modifier) {
				e.preventDefault();
				shortcutMap.get(toggleKey)!();
				return;
			}

			// If the palette is closed, do not process other shortcuts
			if (!open) return;

			// Unique key shortcuts (with potential modifiers)
			const singleKeyShortcut = `${key}${modifierString}`;
			if (shortcutMap.has(singleKeyShortcut)) {
				e.preventDefault();
				const action = shortcutMap.get(singleKeyShortcut)!;
				executeAction(action);
				return;
			}

			// Handling of two-key sequences
			if (keySequence.length === 1) {
				const sequenceKey = `${keySequence[0]}|${key}${modifierString}`;

				if (shortcutMap.has(sequenceKey)) {
					e.preventDefault();
					const action = shortcutMap.get(sequenceKey)!;
					executeAction(action);

					// Reset the sequence
					if (keyTimeout) clearTimeout(keyTimeout);
					setKeySequence([]);
					setKeyTimeout(null);
					return;
				}
			}

			// If no shortcut was triggered, add the key to the sequence
			// and set a timeout to reset it
			if (!modifier) {
				setKeySequence([key]);

				if (keyTimeout) clearTimeout(keyTimeout);
				const timeout = setTimeout(() => {
					setKeySequence([]);
					setKeyTimeout(null);
				}, 1000);
				setKeyTimeout(timeout);
			}
		},
		[open, keySequence, keyTimeout, shortcutMap, executeAction]
	);

	// Effect to attach and detach event listeners
	useEffect(() => {
		document.addEventListener('keydown', handleKeyboardShortcut);
		return () => {
			document.removeEventListener('keydown', handleKeyboardShortcut);
			if (keyTimeout) clearTimeout(keyTimeout);
		};
	}, [handleKeyboardShortcut, keyTimeout]);

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, []);

	// Rendering of command groups from the configuration
	const renderCommandGroups = () => {
		return commandGroups.map((group, groupIndex) => (
			<React.Fragment key={`group-${groupIndex}`}>
				<CommandGroup key={`group-${groupIndex}`} heading={group.heading}>
					{group.commands.map((command, commandIndex) => (
						<ClickableCommandItem
							key={`${group.heading}-${commandIndex}`}
							action={() => {
								executeAction(command.action);
							}}
						>
							{command.icon}
							<span>{command.description}</span>
							<CommandShortcut>
								{command.shortcutDisplay.includes('⌘') ? (
									command.shortcutDisplay
								) : (
									<kbd>{command.shortcutDisplay}</kbd>
								)}
							</CommandShortcut>
						</ClickableCommandItem>
					))}
				</CommandGroup>
			</React.Fragment>
		));
	};

	return (
		<>
			<SidebarCommandForm onClick={() => setOpen(true)} />
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Badge className="m-3 rounded-lg w-fit dark:bg-white/60 dark:text-black">Home</Badge>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
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
