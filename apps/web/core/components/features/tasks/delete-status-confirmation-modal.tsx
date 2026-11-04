import { useUpdateTask } from '@/core/hooks';
import { useDeleteTaskStatus } from '@/core/hooks/tasks/use-delete-task-status';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { Button, Modal, modalFooterClass, modalPrimaryActionClass, modalSecondaryActionClass } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTaskStatus } from '@/core/types/schemas';
import { useAtomValue } from 'jotai';
import { tasksByTeamState } from '@/core/stores';

interface DeleteTaskStatusModalProps {
	open: boolean;
	closeModal: () => void;
	status: TTaskStatus;
	onCancel: () => void;
}

/**
 * A confirmation modal before deleting a status that is used by at least one task in the team.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {ETaskStatusName} props.status - The status object to be deleted
 * @param {() => void} props.onCancel - Callback function when deletion is cancelled
 *
 * @returns {JSX.Element} The modal element
 */
export function DeleteTaskStatusConfirmationModal(props: DeleteTaskStatusModalProps) {
	const { closeModal, open, status, onCancel } = props;
	const { deleteTaskStatus, deleteTaskStatusLoading } = useDeleteTaskStatus();
	const { setTaskStatuses } = useTaskStatusesQuery();
	const t = useTranslations();

	const tasks = useAtomValue(tasksByTeamState);
	const { updateTask } = useUpdateTask();

	// Filter tasks that are using the current status
	const tasksUsingStatus = useMemo(() => tasks.filter((task) => task.status === status.name), [tasks, status.name]);

	const handleCloseModal = useCallback(() => {
		onCancel();
		closeModal();
	}, [closeModal, onCancel]);

	// Function to handle task status deletion
	const handleDeleteTaskStatus = useCallback(async () => {
		if (!status.id) {
			console.error('Status ID is not provided.');
			return;
		}

		try {
			// Update each task that uses the current status
			const updatePromises = tasksUsingStatus.map((task) =>
				updateTask({ ...task, status: ETaskStatusName.OPEN })
			);

			await Promise.all(updatePromises);

			// Delete the task status after updating related tasks
			await deleteTaskStatus(status.id);

			// Update the task status state
			setTaskStatuses((prev) => {
				return prev.filter((el) => el.id !== status.id);
			});
		} catch (error) {
			console.error('Error while deleting task status:', error);
		} finally {
			handleCloseModal();
		}
	}, [deleteTaskStatus, handleCloseModal, setTaskStatuses, status.id, tasksUsingStatus, updateTask]);

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="relative w-[98%] md:w-[28rem]"
			showCloseIcon={false}
			title={t('pages.taskStatus.DELETE_STATUS_CONFIRMATION', { statusName: status.name })}
			aria-labelledby="delete-status-modal-title"
			aria-describedby="delete-status-modal-description"
		>
			<div className="w-full">
				<div className="flex w-full flex-col justify-between gap-6">
					<div className={modalFooterClass}>
						<Button
							disabled={deleteTaskStatusLoading}
							variant="ghost"
							size="default"
							className={modalSecondaryActionClass}
							type="button"
							onClick={handleCloseModal}
						>
							{t('common.NO')}
						</Button>
						<Button
							loading={deleteTaskStatusLoading}
							disabled={deleteTaskStatusLoading}
							onClick={handleDeleteTaskStatus}
							variant="primary"
							size="default"
							className={modalPrimaryActionClass}
							type="submit"
						>
							{t('common.YES')}
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
