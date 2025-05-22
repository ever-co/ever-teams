import { useAuthenticateUser, useDailyPlan, useTeamTasks, useTimer } from '@/core/hooks';
import { IDailyPlan, ITeamTask } from '@/core/types/interfaces/to-review';
import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { ReactNode, useCallback, useMemo } from 'react';
import { Card } from '../../duplicated-components/card';

interface IEnforcePlannedTaskModalProps {
	open: boolean;
	closeModal: () => void;
	task: ITeamTask;
	plan: IDailyPlan;
	content: ReactNode;
	onOK?: () => void;
	openDailyPlanModal?: () => void;
}

export function EnforcePlanedTaskModal(props: IEnforcePlannedTaskModalProps) {
	const { closeModal, task, open, plan, content, onOK, openDailyPlanModal } = props;
	const { addTaskToPlan, addTaskToPlanLoading } = useDailyPlan();
	const { user } = useAuthenticateUser();
	const t = useTranslations();

	const { hasPlan } = useTimer();
	const { activeTeam } = useTeamTasks();

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const hasWorkedHours = useMemo(
		() => hasPlan?.workTimePlanned && hasPlan?.workTimePlanned > 0,
		[hasPlan?.workTimePlanned]
	);
	const areAllTasksEstimated = useMemo(
		() => hasPlan?.tasks?.every((el) => typeof el?.estimate === 'number' && el?.estimate > 0),
		[hasPlan?.tasks]
	);

	const handleAddTaskToPlan = useCallback(() => {
		if (user?.employee && task && plan.id) {
			addTaskToPlan({ employeeId: user.employee.id, taskId: task.id }, plan.id).then(() => {
				closeModal();
				if (requirePlan) {
					if (hasWorkedHours && areAllTasksEstimated && task.estimate) {
						onOK?.();
					} else {
						openDailyPlanModal?.();
					}
				} else {
					onOK?.();
				}
			});
		}
	}, [
		addTaskToPlan,
		areAllTasksEstimated,
		closeModal,
		hasWorkedHours,
		onOK,
		openDailyPlanModal,
		plan.id,
		requirePlan,
		task,
		user?.employee
	]);

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative" showCloseIcon={false}>
			<Card className="w-full" shadow="custom">
				<div className="w-full flex flex-col justify-between gap-6">
					<Text.Heading as="h5" className="mb-3 text-center">
						{content}
					</Text.Heading>
					<div className="w-full flex items-center justify-evenly">
						<Button
							variant="outline"
							type="button"
							onClick={closeModal}
							className="rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							{t('common.NO')}
						</Button>
						<Button
							onClick={handleAddTaskToPlan}
							loading={addTaskToPlanLoading}
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
