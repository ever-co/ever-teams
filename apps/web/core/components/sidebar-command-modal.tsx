'use client';
import * as React from 'react';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
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
	ProfileIcon,
	SettingsIcon,
	TasksIcon,
	TeamIcon,
	UserCircleIcon
} from './icons';
import { FC } from 'react';
import { CreateTeamModal } from './features';
import { useAuthenticateUser } from '../hooks/auth';
import { useModal } from '../hooks';

export const SidebarCommandModal: FC<{ publicTeam: boolean }> = ({ publicTeam }) => {
	const [open, setOpen] = React.useState(false);

	const { isOpen, closeModal } = useModal();
	const { user } = useAuthenticateUser();
	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, []);

	return (
		<>
			<SidebarCommandForm onClick={() => setOpen(true)} />
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Badge className="m-3 rounded-lg w-fit">Home</Badge>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>

					<CommandGroup heading="Suggestions">
						<CommandItem>
							<AddUserIcon />
							<span>Invite User</span>
							<CommandShortcut>⌘IU</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<UserCircleIcon />
							<span>Assign to me</span>
							<CommandShortcut>⌘AM</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandGroup heading="Tasks">
						<CommandItem>
							<AddTaskIcon />
							<span>Create New Task</span>
							<CommandShortcut>CT</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<TasksIcon />
							<span>Search Tasks</span>
							<CommandShortcut>ST</CommandShortcut>
						</CommandItem>
					</CommandGroup>

					<CommandGroup heading="Teams">
						<CommandItem onClick={() => setOpen(true)}>
							<AddTeamIcon />
							<span>Create New Team</span>
							<CommandShortcut>⌘CT</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<TeamIcon />
							<span>Search Teams</span>
							<CommandShortcut>⌘ST</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandGroup heading="Projects">
						<CommandItem>
							<AddIcon />
							<span>Create New Project</span>
							<CommandShortcut>⌘CP</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<DashboardIcon />
							<span>Search Projects</span>
							<CommandShortcut>⌘SP</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Settings">
						<CommandItem>
							<ProfileIcon />
							<span>Profile</span>
							<CommandShortcut>⌘P</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<SettingsIcon />
							<span>Settings</span>
							<CommandShortcut>
								<kbd>⌘S</kbd>
							</CommandShortcut>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>

			{!publicTeam && <CreateTeamModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />}
		</>
	);
};
