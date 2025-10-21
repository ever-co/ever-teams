import { useTaskStatus, useTeamTasks } from '@/core/hooks';
import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { EverCard } from '../../common/ever-card';
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
	const { deleteTaskStatus, deleteTaskStatusLoading, setTaskStatuses } = useTaskStatus();
	const t = useTranslations();

	const tasks = useAtomValue(tasksByTeamState);
	const { updateTask } = useTeamTasks();

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
			className="w-[98%] md:w-[530px] relative"
			showCloseIcon={false}
			aria-labelledby="delete-status-modal-title"
			aria-describedby="delete-status-modal-description"
		>
			<EverCard className="w-full" shadow="custom">
				<div className="flex flex-col gap-6 justify-between w-full">
					<Text.Heading as="h5" id="delete-status-modal-title" className="mb-3 text-center">
						{t('pages.taskStatus.DELETE_STATUS_CONFIRMATION', { statusName: status.name })}
					</Text.Heading>
					<div className="flex justify-evenly items-center w-full">
						<Button
							disabled={deleteTaskStatusLoading}
							variant="outline"
							type="button"
							onClick={handleCloseModal}
							className="font-light rounded-md text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							{t('common.NO')}
						</Button>
						<Button
							loading={deleteTaskStatusLoading}
							disabled={deleteTaskStatusLoading}
							onClick={handleDeleteTaskStatus}
							variant="primary"
							type="submit"
							className="font-light rounded-md text-md dark:text-white"
						>
							{t('common.YES')}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
