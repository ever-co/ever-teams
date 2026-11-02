'use client';

import { useAtom, useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { useCallback, useRef } from 'react';
import { assignTaskModalState } from '@/core/stores/assign-task-modal';
import { Modal } from '@/core/components';
import { TaskInput } from '../../tasks/task-input';
import { useTranslations } from 'next-intl';

/**
 * Global instance of AssignTaskModal
 * This component should be rendered ONCE at a root level component
 * to ensure only one modal instance exists across the entire app.
 *
 * This pattern fixes the issue where the modal was closing immediately
 * because it was rendered inside a HeadlessUI Popover that would unmount.
 *
 * Usage:
 * 1. Import and render <GlobalAssignTaskModal /> in a root level component
 * 2. Use the assignTaskModalState atom to open/close the modal from anywhere:
 *
 * ```tsx
 * import { useSetAtom } from 'jotai';
 * import { assignTaskModalState } from '@/core/stores/assign-task-modal';
 *
 * const setAssignTaskModal = useSetAtom(assignTaskModalState);
 *
 * // Open modal
 * setAssignTaskModal({
 *   isOpen: true,
 *   tasks: memberInfo.memberUnassignTasks,
 *   userProfile: memberInfo.member,
 *   employeeId: memberInfo.member?.employeeId ?? null,
 *   onTaskClick: (task, close) => { ... }
 * });
 *
 * // Close modal
 * setAssignTaskModal(prev => ({ ...prev, isOpen: false, onTaskClick: undefined, onTaskCreated: undefined }));
 * ```
 */
export function GlobalAssignTaskModal() {
	const [modalState, setModalState] = useAtom(assignTaskModalState);
	const activeTeam = useAtomValue(activeTeamState);
	const t = useTranslations();

	const modalStateRef = useRef(modalState);
	modalStateRef.current = modalState;

	const closeModal = useCallback(() => {
		setModalState((prev) => ({ ...prev, isOpen: false, onTaskClick: undefined, onTaskCreated: undefined }));
	}, [setModalState]);

	const handleTaskClick = useCallback(
		(task: Parameters<NonNullable<typeof modalState.onTaskClick>>[0]) => {
			const currentOnTaskClick = modalStateRef.current.onTaskClick;
			currentOnTaskClick?.(task, closeModal);
		},
		[modalStateRef, closeModal]
	);

	const handleTaskCreated = useCallback(
		(task: Parameters<NonNullable<typeof modalState.onTaskCreated>>[0]) => {
			const currentOnTaskCreated = modalStateRef.current.onTaskCreated;
			currentOnTaskCreated?.(task, closeModal);
		},
		[modalStateRef, closeModal]
	);

	if (!modalState.isOpen) {
		return null;
	}

	const assigneeName = modalState.userProfile?.employee?.user?.name;
	let modalTitle = '';
	if (assigneeName) {
		modalTitle = `${t('common.ASSIGN_TASK_TO')} ${assigneeName}`;
	}

	return (
		<Modal
			isOpen={modalState.isOpen}
			closeModal={closeModal}
			title={modalTitle}
			breadcrumb={activeTeam?.name}
			className="h-[70vh] min-h-[640px] w-full justify-start overflow-y-hidden md:w-[70vw]"
		>
			<TaskInput
				task={null}
				tasks={modalState.tasks}
				tasksComplete={modalState.tasksComplete}
				initEditMode={true}
				keepOpen={true}
				autoAssignTaskAuth={false}
				createOnEnterClick={true}
				onTaskClick={handleTaskClick}
				onTaskCreated={handleTaskCreated}
				usersTaskCreatedAssignTo={modalState.employeeId ? [{ id: modalState.employeeId }] : undefined}
				cardWithoutShadow
				fullWidthCombobox
				fullHeightCombobox
				autoFocus
				assignTaskPopup={true}
			/>
		</Modal>
	);
}
