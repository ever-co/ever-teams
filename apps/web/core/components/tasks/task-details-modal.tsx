import { Modal } from '@/core/components';
import { useCallback } from 'react';
import { clsxm } from '@/core/lib/utils';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { TaskDetailsComponent } from '../pages/task/task-details';
import { EverCard } from '../common/ever-card';
import { TTask } from '@/core/types/schemas/task/task.schema';

interface ITaskDetailsModalProps {
	closeModal: () => void;
	isOpen: boolean;
	task: TTask;
}

/**
 * A Big Modal that shows task details
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {TTask} props.task - The task to show details about
 *
 * @returns {JSX.Element} The modal element
 */
export function TaskDetailsModal(props: ITaskDetailsModalProps) {
	const { isOpen, closeModal, task } = props;

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[90vw] h-[90vh]')}>
			<EverCard className="w-full h-full pt-12 overflow-hidden" shadow="custom">
				<ScrollArea className="w-full h-full">
					<TaskDetailsComponent task={task} />
					<ScrollBar className="-pr-20" />
				</ScrollArea>
			</EverCard>
		</Modal>
	);
}
