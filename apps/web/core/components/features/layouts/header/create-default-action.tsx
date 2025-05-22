'use client';
import { Button } from '@/core/components/common/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';

import { useState } from 'react';
import { AddUserIcon, ProjectIcon, TaskIcon, TeamIcon } from '../../../icons';
import { useAuthenticateUser, useModal } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { Modal } from '../../../common/modal';
import CreateTaskModal from '../../tasks/create-task-modal';
import { InviteFormModal } from '../../teams/invite-form-modal';
import { CreateTeamModal } from '../../teams/create-team-modal';
export const DefaultCreateAction = ({ publicTeam }: { publicTeam?: boolean }) => {
	const [open, setOpen] = useState<boolean>(false);
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: inviteIsOpen, closeModal: inviteCloseModal, openModal: inviteOpenModal } = useModal();
	const { isOpen: createTaskIsOpen, closeModal: createTaskCloseModal, openModal: createTaskOpenModal } = useModal();
	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="px-5 py-2.5 text-xs text-indigo-500 border-indigo-500 rounded-full h-fit group dark:bg-black/10 dark:hover:text-gray-50 dark:hover:border-gray-50"
						variant="outline"
						aria-expanded={open}
						aria-label={open ? 'Close menu' : 'Open menu'}
						onClick={() => setOpen((prevState) => !prevState)}
					>
						<svg
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							className="transition-transform duration-500 w-5 ease-out group-aria-expanded:rotate-[135deg] text-indigo-500"
							width={24}
							height={24}
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2Zm4 10.75h-3.25V16c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-3.25H8c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h3.25V8c0-.41.34-.75.75-.75s.75.34.75.75v3.25H16c.41 0 .75.34.75.75s-.34.75-.75.75Z"
								fill="currentColor"
							/>
						</svg>
						Quick Create
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="right-0 w-56 z-[9999] dark:bg-black/80 backdrop-blur-md"
					side="right"
					align="start"
				>
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={createTaskOpenModal}>
							<TaskIcon />
							Task
							<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={openModal} disabled={!user?.isEmailVerified}>
							<TeamIcon /> Team
							<DropdownMenuShortcut>⌘CM</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem>
							<ProjectIcon /> Project
							<DropdownMenuShortcut>⌘CT</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={inviteOpenModal} className="!text-indigo-500">
						<AddUserIcon className="!text-indigo-500" /> Invite
						<DropdownMenuShortcut className="!text-indigo-500">⌘CI</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Modal isOpen={createTaskIsOpen} closeModal={createTaskCloseModal}>
				<CreateTaskModal
					onClose={createTaskCloseModal}
					title={t('common.CREATE_TASK')}
					initEditMode={false}
					task={null}
					tasks={[]}
				/>
			</Modal>
			{!publicTeam && <CreateTeamModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />}

			<InviteFormModal open={inviteIsOpen && !!user?.isEmailVerified} closeModal={inviteCloseModal} />
		</div>
	);
};
