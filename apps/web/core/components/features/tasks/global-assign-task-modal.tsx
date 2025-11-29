'use client';

import { useAtom } from 'jotai';
import { useCallback } from 'react';
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
 * setAssignTaskModal(prev => ({ ...prev, isOpen: false }));
 * ```
 */
export function GlobalAssignTaskModal() {
	const [modalState, setModalState] = useAtom(assignTaskModalState);
	const t = useTranslations();

	const closeModal = useCallback(() => {
		setModalState((prev) => ({ ...prev, isOpen: false }));
	}, [setModalState]);

	const handleTaskClick = useCallback(
		(task: Parameters<NonNullable<typeof modalState.onTaskClick>>[0]) => {
			modalState.onTaskClick?.(task, closeModal);
		},
		[modalState.onTaskClick, closeModal]
	);

	const handleTaskCreated = useCallback(
		(task: Parameters<NonNullable<typeof modalState.onTaskCreated>>[0]) => {
			modalState.onTaskCreated?.(task, closeModal);
		},
		[modalState.onTaskCreated, closeModal]
	);

	if (!modalState.isOpen) {
		return null;
	}

	return (
		<Modal
			isOpen={modalState.isOpen}
			closeModal={closeModal}
			title={
				modalState.userProfile?.employee?.user?.name
					? `${t('common.ASSIGN_TASK_TO')} ${modalState.userProfile.employee.user.name}`
					: ''
			}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-[70vw] h-[70vh] min-h-[640px] justify-start overflow-y-hidden"
			titleClass="font-normal"
		>
			<TaskInput
				task={null}
				tasks={modalState.tasks}
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

