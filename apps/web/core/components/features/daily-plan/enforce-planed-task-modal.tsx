import { useAuthenticateUser, useDailyPlan, useTeamTasks, useTimer } from '@/core/hooks';
import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { ITask } from '@/core/types/interfaces/task/task';
import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { ReactNode, useCallback, useMemo } from 'react';
import { EverCard } from '../../common/ever-card';

interface IEnforcePlannedTaskModalProps {
	open: boolean;
	closeModal: () => void;
	task: ITask;
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
		() => hasPlan?.tasks?.every((el: ITask) => typeof el?.estimate === 'number' && el?.estimate > 0),
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
			<EverCard className="w-full" shadow="custom">
				<div className="flex flex-col justify-between w-full gap-6">
					<Text.Heading as="h5" className="mb-3 text-center">
						{content}
					</Text.Heading>
					<div className="flex items-center w-full justify-evenly">
						<Button
							variant="outline"
							type="button"
							onClick={closeModal}
							className="font-light rounded-md text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
						>
							{t('common.NO')}
						</Button>
						<Button
							onClick={handleAddTaskToPlan}
							loading={addTaskToPlanLoading}
							variant="primary"
							type="submit"
							className="font-light rounded-md  text-md dark:text-white"
						>
							{t('common.YES')}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
