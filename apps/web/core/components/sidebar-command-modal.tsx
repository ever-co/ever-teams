'use client';
import * as React from 'react';
import { FC, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut
} from '@/core/components/common/command';
import { SidebarCommandForm } from './sidebar-command-form';
import { Badge } from './common/badge';
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
} from './icons';
import { useAuthenticateUser } from '../hooks/auth';
import { useModal } from '../hooks';
import { useTranslations } from 'next-intl';
import { Modal } from './common/modal';
import CreateTaskModal from './pages/kanban/create-task-modal';

import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { ArrowUpRightIcon } from 'lucide-react';
import { useKeyboardShortcuts, CommandShortcutConfig } from '@/core/hooks/common/use-keyboard-shortcuts';
import { CreateTeamModal } from './teams/create-team-modal';
import { InviteFormModal } from './teams/invite/invite-form-modal';
import { CreateProjectModal } from './projects/create-project-modal';

// Definition of types to improve readability and security
type ShortcutAction = () => void;

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

	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const { setTheme, resolvedTheme } = useTheme();
	const name = user?.name || user?.firstName || user?.lastName || user?.username;
	const profileLink = `/profile/${user?.id}?name=${name || ''}`;
	const timesheetLink = `/timesheet/${user?.id}?name=${encodeURIComponent(name || '')}`;
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
			navigateToTimesheetsReport: () => router.push(timesheetLink),
			navigateToWeeklyLimitReport: () => router.push('/reports/weekly-limit'),
			navigateToTimeAndActivityReport: () => router.push('/time-and-activity'),
			navigateToMyTasks: () => router.push(profileLink),
			navigateToMyTeamsTasks: () => router.push('/teams/tasks'),
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
						description: 'Create New Project',
						shortcutDisplay: 'CP',
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
						sequence: ['m', 't'],
						modifiers: ['ctrl'],
						description: 'Go to My Tasks',
						shortcutDisplay: '⌘MT',
						action: actions.navigateToMyTasks,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['t', 't'],
						modifiers: ['ctrl'],
						description: "Go to My Team's Tasks",
						shortcutDisplay: '⌘TT',
						action: actions.navigateToMyTeamsTasks,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['t', 'p'],
						modifiers: ['ctrl'],
						description: 'Go to Projects',
						shortcutDisplay: '⌘TP',
						action: actions.navigateToProjects,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['k'],
						modifiers: ['ctrl'],
						description: 'Go to Kanban',
						shortcutDisplay: '⌘K',
						action: actions.navigateToKanban,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['h'],
						modifiers: ['ctrl'],
						description: 'Go to Home Page',
						shortcutDisplay: '⌘H',
						action: actions.navigateToHome,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['t', 's'],
						modifiers: ['ctrl'],
						description: 'Go to Timesheets Report',
						shortcutDisplay: '⌘TS',
						action: actions.navigateToTimesheetsReport,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['w', 'l'],
						modifiers: ['ctrl'],
						description: 'Go to Weekly Limit Report',
						shortcutDisplay: '⌘WL',
						action: actions.navigateToWeeklyLimitReport,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
					},
					{
						sequence: ['t', 'a'],
						modifiers: ['ctrl'],
						description: 'Go to Time & Activity Report',
						shortcutDisplay: '⌘TA',
						action: actions.navigateToTimeAndActivityReport,
						icon: <ArrowUpRightIcon className="opacity-60" aria-hidden="true" />
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

	// Extract all shortcut configurations for the global hook
	const allShortcuts = useMemo(() => {
		const shortcuts: CommandShortcutConfig[] = [];
		commandGroups.forEach((group) => {
			group.commands.forEach((command) => {
				shortcuts.push(command);
			});
		});
		return shortcuts;
	}, [commandGroups]);

	// Use our global keyboard shortcut hook
	useKeyboardShortcuts(allShortcuts, setOpen);

	// Keyboard shortcut in current component only for Ctrl+K
	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			const isToggleKey = e.key === 'k' && (e.metaKey || e.ctrlKey);
			if (isToggleKey) {
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
