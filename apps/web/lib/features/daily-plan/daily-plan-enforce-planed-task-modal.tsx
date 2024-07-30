import { useAuthenticateUser, useDailyPlan, useTimerView } from '@app/hooks';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { Button, Card, Modal, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

interface IProps {
	open: boolean;
	closeModal: () => void;
	task: ITeamTask;
	plan: IDailyPlan;
}

export function EnforcePlanedTaskModal(props: IProps) {
	const { closeModal, task, open, plan } = props;
	const t = useTranslations();
	const { addTaskToPlan, addTaskToPlanLoading } = useDailyPlan();
	const { startTimer } = useTimerView();
	const { user } = useAuthenticateUser();

	const handleAddTaskToPlan = useCallback(() => {
		if (user?.employee && task && plan.id) {
			addTaskToPlan({ employeeId: user.employee.id, taskId: task.id }, plan.id).then(() => {
				closeModal();
				startTimer();
			});
		}
	}, [addTaskToPlan, closeModal, plan.id, startTimer, task, user?.employee]);

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative" showCloseIcon={false}>
			<Card className="w-full" shadow="custom">
				<div className="w-full flex flex-col justify-between gap-6">
					<Text.Heading as="h5" className="mb-3 text-center">
						{t('dailyPlan.SUGGESTS_TO_ADD_TASK_TO_TODAY_PLAN')}
					</Text.Heading>
					<div className="w-full flex items-center justify-evenly">
						<Button
							variant="outline"
							type="button"
							onClick={closeModal}
							className="rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							No
						</Button>
						<Button
							onClick={handleAddTaskToPlan}
							loading={addTaskToPlanLoading}
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
