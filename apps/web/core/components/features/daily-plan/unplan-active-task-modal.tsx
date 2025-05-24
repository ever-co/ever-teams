import { useAuthenticateUser, useDailyPlan, useTimerView } from '@/core/hooks';
import { IDailyPlan } from '@/core/types/interfaces/daily-plan/IDailyPlan';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { Button, Modal, Text } from '@/core/components';
import { useCallback } from 'react';
import { Card } from '../../duplicated-components/card';

interface UnplanActiveTaskModalProps {
	open: boolean;
	closeModal: () => void;
	task: ITask;
	plan: IDailyPlan;
}

/**
 * A Modal that gives the possibility to unplan the active task.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {ITask} props.task - The task to unplan
 * @param {IDailyPlan} props.plan - The today's plan
 *
 * @returns {JSX.Element} The modal element
 */
export function UnplanActiveTaskModal(props: UnplanActiveTaskModalProps) {
	const { closeModal, task, open, plan } = props;
	const { user } = useAuthenticateUser();
	const { removeTaskFromPlan, removeTaskFromPlanLoading } = useDailyPlan();
	const { stopTimer, timerStatus } = useTimerView();

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const handleUnplanTask = useCallback(async () => {
		try {
			plan.id && (await removeTaskFromPlan({ taskId: task.id, employeeId: user?.employee.id }, plan.id));
		} catch (error) {
			console.log(error);
		}
	}, [plan.id, removeTaskFromPlan, task.id, user?.employee.id]);

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
			<Card className="w-full" shadow="custom">
				<div className="w-full flex flex-col justify-between gap-6">
					<Text.Heading as="h5" className="mb-3 text-center">
						You are about to unplan the current active task, please confirm the action
					</Text.Heading>
					<div className="w-full flex items-center justify-evenly">
						<Button
							disabled={removeTaskFromPlanLoading}
							variant="outline"
							type="button"
							onClick={handleCloseModal}
							className="rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							No
						</Button>
						<Button
							loading={removeTaskFromPlanLoading}
							disabled={removeTaskFromPlanLoading}
							onClick={onYes}
							variant="primary"
							type="submit"
							className=" rounded-md font-light text-md dark:text-white"
						>
							Yes
						</Button>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
