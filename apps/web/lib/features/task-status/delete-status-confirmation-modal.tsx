import { ITaskStatusItemList } from '@/app/interfaces';
import { useTaskStatus } from '@app/hooks';
import { Button, Card, Modal, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

interface DeleteTaskStatusModalProps {
	open: boolean;
	closeModal: () => void;
	status: ITaskStatusItemList;
	onCancel: () => void;
}

/**
 * A confirmation modal before deleting a status that is used by at least one task in the team.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {ITaskStatusItemList} props.status - The status object to be deleted
 * @param {() => void} props.onCancel - Callback function when deletion is cancelled
 *
 * @returns {JSX.Element} The modal element
 */
export function DeleteTaskStatusConfirmationModal(props: DeleteTaskStatusModalProps) {
	const { closeModal, open, status, onCancel } = props;
	const { deleteTaskStatus, deleteTaskStatusLoading } = useTaskStatus();
	const t = useTranslations();

	const handleCloseModal = useCallback(() => {
		onCancel();
		closeModal();
	}, [closeModal, onCancel]);

	// The function that will be called when the user confirms the action
	const handleDeleteTaskStatus = useCallback(async () => {
		try {
			await deleteTaskStatus(status.id);
		} catch (error) {
			console.log(error);
		}

		handleCloseModal();
	}, [deleteTaskStatus, handleCloseModal, status]);

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="w-[98%] md:w-[530px] relative"
			showCloseIcon={false}
			aria-labelledby="delete-status-modal-title"
			aria-describedby="delete-status-modal-description"
		>
			<Card className="w-full" shadow="custom">
				<div className="w-full flex flex-col justify-between gap-6">
					<Text.Heading as="h5" id="delete-status-modal-title" className="mb-3 text-center">
						{t('pages.taskStatus.DELETE_STATUS_CONFIRMATION', { statusName: status.name })}
					</Text.Heading>
					<div className="w-full flex items-center justify-evenly">
						<Button
							disabled={deleteTaskStatusLoading}
							variant="outline"
							type="button"
							onClick={handleCloseModal}
							className="rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							{t('common.NO')}
						</Button>
						<Button
							loading={deleteTaskStatusLoading}
							disabled={deleteTaskStatusLoading}
							onClick={handleDeleteTaskStatus}
							variant="primary"
							type="submit"
							className=" rounded-md font-light text-md dark:text-white"
						>
							{t('common.YES')}
						</Button>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
