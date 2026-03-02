import { HostKeys, useHotkeys } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren, useCallback } from 'react';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtom } from 'jotai';
import { assignTaskModalState } from '@/core/stores/assign-task-modal';

/**
 * TaskUnOrAssignPopover - Trigger component for the global assign task modal
 *
 * This component only renders the trigger button. The actual modal is rendered
 * globally by GlobalAssignTaskModal to avoid issues with parent Popover components
 * unmounting and causing the modal to close unexpectedly.
 *
 * The modal state is managed via Jotai atom (assignTaskModalState) to survive
 * component unmounting when used inside HeadlessUI Popover panels.
 */
export function TaskUnOrAssignPopover({
	children,
	tasks,
	onTaskClick,
	buttonClassName,
	onTaskCreated,
	usersTaskCreatedAssignTo,
	userProfile
}: PropsWithChildren<{
	tasks?: TTask[];
	onTaskClick?: (task: TTask, close: () => void) => void;
	buttonClassName?: string;
	onTaskCreated?: (task: TTask | undefined, close: () => void) => void;
	usersTaskCreatedAssignTo?: {
		id: string;
	}[];
	userProfile?: TOrganizationTeamEmployee;
}>) {
	const [modalState, setModalState] = useAtom(assignTaskModalState);

	const openModal = useCallback(() => {
		setModalState({
			isOpen: true,
			tasks: tasks ?? [],
			userProfile: userProfile ?? null,
			employeeId: usersTaskCreatedAssignTo?.[0]?.id ?? null,
			onTaskClick,
			onTaskCreated
		});
	}, [setModalState, tasks, userProfile, usersTaskCreatedAssignTo, onTaskClick, onTaskCreated]);

	const closeModal = useCallback(() => {
		setModalState((prev) => ({ ...prev, isOpen: false }));
	}, [setModalState]);

	// Handling Hotkeys
	const handleAssignTask = useCallback(() => {
		if (modalState.isOpen) {
			closeModal();
		} else {
			openModal();
		}
	}, [modalState.isOpen, openModal, closeModal]);
	useHotkeys(HostKeys.ASSIGN_TASK, handleAssignTask);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			// Prevent the event from propagating to parent Popover
			e.stopPropagation();
			openModal();
		},
		[openModal]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				openModal();
			}
		},
		[openModal]
	);

	return (
		<button
			type="button"
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={clsxm(
				'flex items-center mb-1.5 outline-hidden border-none cursor-pointer rounded-xl bg-transparent',
				buttonClassName
			)}
		>
			{children}
		</button>
	);
}
