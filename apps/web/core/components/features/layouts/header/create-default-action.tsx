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

import { useMemo } from 'react';
import { AddUserIcon, ProjectIcon, TaskIcon, TeamIcon } from '../../../icons';
import { Plus } from '../../../icons';
import { useAuthenticateUser, useModal } from '@/core/hooks';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { toast } from 'sonner';
import { cn } from '@/core/lib/helpers';
import { Tooltip } from '../../../duplicated-components/tooltip';
import { Modal } from '../../../common/modal';
import CreateTaskModal from '../../tasks/create-task-modal';
import { InviteFormModal } from '../../teams/invite-form-modal';
import { CreateTeamModal } from '../../teams/create-team-modal';
import { CreateProjectModal } from '../../projects/create-project-modal';

const CREATE_BLOCKED_TOAST_ID = 'create-blocked-timer-running';

type DefaultCreateActionProps = {
	publicTeam?: boolean;
	className?: string;
};

/** The quick-create menu of the sidebar header: task, team, project, and invite when allowed. */
export const DefaultCreateAction = ({ publicTeam, className }: DefaultCreateActionProps) => {
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	// The API refuses an invitation into a team the user does not manage (403): offer Invite only to who may send it.
	const canInvite = useCanInviteToActiveTeam();
	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: inviteIsOpen, closeModal: inviteCloseModal, openModal: inviteOpenModal } = useModal();
	const { isOpen: createTaskIsOpen, closeModal: createTaskCloseModal, openModal: createTaskOpenModal } = useModal();

	const { isOpen: projectIsOpen, closeModal: projectCloseModal, openModal: projectOpenModal } = useModal();

	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);

	const handleCreateTaskClick = () => {
		if (timerRunningStatus) {
			toast.warning(t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), { id: CREATE_BLOCKED_TOAST_ID });
			return;
		}
		createTaskOpenModal();
	};

	const handleCreateTeamClick = () => {
		if (timerRunningStatus) {
			toast.warning(t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING'), { id: CREATE_BLOCKED_TOAST_ID });
			return;
		}
		openModal();
	};

	const quickCreateLabel = t('sidebar.QUICK_CREATE');
	const isEmailVerified = Boolean(user?.isEmailVerified);
	const teamItemDisabled = !isEmailVerified || timerRunningStatus;

	let teamItemTitle: string | undefined;
	if (timerRunningStatus) {
		teamItemTitle = t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING');
	} else if (!isEmailVerified) {
		teamItemTitle = t('common.VERIFY_ACCOUNT_MSG');
	}

	let taskItemTitle: string | undefined;
	if (timerRunningStatus) {
		taskItemTitle = t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING');
	}

	let teamTooltipLabel = t('common.VERIFY_ACCOUNT_MSG');
	if (timerRunningStatus) {
		teamTooltipLabel = t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING');
	}

	return (
		<div className={cn('shrink-0', className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						className="text-muted-foreground hover:text-foreground aria-expanded:text-foreground"
						aria-label={quickCreateLabel}
						title={quickCreateLabel}
					>
						<Plus className="size-4" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56" side="bottom" align="start">
					{timerRunningStatus && (
						<div className="mb-1 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-warning-foreground">
							{t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
						</div>
					)}
					<DropdownMenuGroup>
						<Tooltip
							enabled={timerRunningStatus}
							label={t('common.CREATE_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
							placement="bottom"
							labelContainerClassName="z-[1100] w-fit max-w-xs"
						>
							<DropdownMenuItem
								onClick={handleCreateTaskClick}
								disabled={timerRunningStatus}
								className={cn(timerRunningStatus && 'cursor-not-allowed opacity-50')}
								title={taskItemTitle}
							>
								<TaskIcon />
								Task
								<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
							</DropdownMenuItem>
						</Tooltip>
						<Tooltip
							enabled={teamItemDisabled}
							label={teamTooltipLabel}
							placement="bottom"
							labelContainerClassName="z-[1100] w-fit max-w-xs"
						>
							<DropdownMenuItem
								onClick={handleCreateTeamClick}
								disabled={teamItemDisabled}
								className={cn(timerRunningStatus && 'cursor-not-allowed opacity-50')}
								title={teamItemTitle}
							>
								<TeamIcon /> Team
								<DropdownMenuShortcut>⌘CM</DropdownMenuShortcut>
							</DropdownMenuItem>
						</Tooltip>
						<DropdownMenuItem onClick={projectOpenModal}>
							<ProjectIcon /> Project
							<DropdownMenuShortcut>⌘CT</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuGroup>
					{canInvite && (
						<>
							<DropdownMenuSeparator />

							<DropdownMenuItem onClick={inviteOpenModal} className="text-primary-ink">
								<AddUserIcon className="text-primary-ink" /> Invite
								<DropdownMenuShortcut className="text-primary-ink">⌘CI</DropdownMenuShortcut>
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Modal isOpen={createTaskIsOpen && !timerRunningStatus} closeModal={createTaskCloseModal}>
				<CreateTaskModal
					onClose={createTaskCloseModal}
					title={t('common.CREATE_TASK')}
					initEditMode={false}
					task={null}
					tasks={[]}
				/>
			</Modal>
			{!publicTeam && (
				<CreateTeamModal open={isOpen && isEmailVerified && !timerRunningStatus} closeModal={closeModal} />
			)}

			<InviteFormModal open={inviteIsOpen && isEmailVerified} closeModal={inviteCloseModal} />
			<CreateProjectModal open={projectIsOpen && isEmailVerified} closeModal={projectCloseModal} />
		</div>
	);
};
