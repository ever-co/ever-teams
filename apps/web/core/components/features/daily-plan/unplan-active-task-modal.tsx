import { useDailyPlan, useTimerView } from '@/core/hooks';
import { Button, Modal, Text } from '@/core/components';
import { useCallback } from 'react';
import { EverCard } from '../../common/ever-card';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

interface UnplanActiveTaskModalProps {
	open: boolean;
	closeModal: () => void;
	task: TTask;
	plan: TDailyPlan;
}

/**
 * A Modal that gives the possibility to unplan the active task.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {TTask} props.task - The task to unplan
 * @param {TDailyPlan} props.plan - The today's plan
 *
 * @returns {JSX.Element} The modal element
 */
export function UnplanActiveTaskModal(props: UnplanActiveTaskModalProps) {
	const { closeModal, task, open, plan } = props;
	const { data: user } = useUserQuery();
	const timerStatus = useAtomValue(timerStatusState);

	const { removeTaskFromPlan, removeTaskFromPlanLoading } = useDailyPlan();
	const { stopTimer } = useTimerView();

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const handleUnplanTask = useCallback(async () => {
		try {
			plan.id && (await removeTaskFromPlan({ taskId: task.id, employeeId: user?.employee?.id }, plan.id));
		} catch (error) {
			console.log(error);
		}
	}, [plan.id, removeTaskFromPlan, task.id, user?.employee?.id]);

	// The function that will be called when the user clicks on 'YES' button
	const onYes = useCallback(async () => {
		if (timerStatus?.running) {
			stopTimer();
		}
		await handleUnplanTask();
		handleCloseModal();
	}, [handleCloseModal, handleUnplanTask, stopTimer, timerStatus?.running]);

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative" showCloseIcon={false}>
			<EverCard className="w-full" shadow="custom">
				<div className="flex flex-col gap-6 justify-between w-full">
					<Text.Heading as="h5" className="mb-3 text-center">
						You are about to unplan the current active task, please confirm the action
					</Text.Heading>
					<div className="flex justify-evenly items-center w-full">
						<Button
							disabled={removeTaskFromPlanLoading}
							variant="outline"
							type="button"
							onClick={handleCloseModal}
							className="font-light rounded-md text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							No
						</Button>
						<Button
							loading={removeTaskFromPlanLoading}
							disabled={removeTaskFromPlanLoading}
							onClick={onYes}
							variant="primary"
							type="submit"
							className="font-light rounded-md text-md dark:text-white"
						>
							Yes
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
