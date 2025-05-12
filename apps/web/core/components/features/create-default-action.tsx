'use client';
import { Button } from '@/core/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/core/components/ui/dropdown-menu';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { AddUserIcon, ProjectIcon, TaskIcon, TeamIcon } from '../icons';

export function DefaultCreateAction() {
	const [open, setOpen] = useState<boolean>(false);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="rounded-full group"
					variant="outline"
					onClick={() => setOpen((prevState) => !prevState)}
				>
					<span
						className="rounded-full group"
						aria-expanded={open}
						aria-label={open ? 'Close menu' : 'Open menu'}
					>
						<PlusIcon
							className="transition-transform duration-500 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] group-aria-expanded:rotate-[135deg]"
							size={16}
							aria-hidden="true"
						/>
					</span>
					Create
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="right-0 w-56 z-[9999]" side="right" align="start">
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<TaskIcon />
						Task
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<ProjectIcon /> Project
						<DropdownMenuShortcut>⌘CT</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<TeamIcon /> Team
						<DropdownMenuShortcut>⌘CM</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />

				<DropdownMenuItem className="text-indigo-500">
					<AddUserIcon className="text-indigo-500" /> Invite users
					<DropdownMenuShortcut className="text-indigo-500">⌘CI</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuGroup></DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
