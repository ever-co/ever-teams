import { Modal } from '@/core/components';
import { useCallback } from 'react';
import { clsxm } from '@/core/lib/utils';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { TaskDetailsComponent } from '../pages/task/task-details';
import { EverCard } from '../common/ever-card';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { detailedTaskState } from '@/core/stores';

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
	const detailedTask = useAtomValue(detailedTaskState);
	// The opener fetches this task's detail; the list copy has no linked issues.
	const shownTask = detailedTask?.id === task.id ? detailedTask : task;

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[90vw] h-[90vh]')}>
			<EverCard className="w-full h-full pt-12 overflow-hidden" shadow="custom">
				<ScrollArea className="w-full h-full">
					<TaskDetailsComponent task={shownTask} />
					<ScrollBar className="-pr-20" />
				</ScrollArea>
			</EverCard>
		</Modal>
	);
}
