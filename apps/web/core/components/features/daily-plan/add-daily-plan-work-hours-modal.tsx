import { Modal, SpinnerLoader, Text } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { useCallback, useMemo, useState } from 'react';
import { DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { useDailyPlan, useTeamTasks, useTimerView } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

interface IAddDailyPlanWorkHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan: TDailyPlan;
}

export function AddDailyPlanWorkHourModal(props: IAddDailyPlanWorkHoursModalProps) {
	const { closeModal, isOpen, plan } = props;

	const t = useTranslations();
	const { updateDailyPlan } = useDailyPlan();
	const { startTimer } = useTimerView();
	const { activeTeam } = useTeamTasks();
	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan.workTimePlanned);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const hasWorkHours = useMemo(() => plan.workTimePlanned && plan.workTimePlanned > 0, [plan.workTimePlanned]);
	const [loading, setLoading] = useState(false);

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		closeModal();
	}, [closeModal, currentDate]);

	const handleSubmit = useCallback(async () => {
		try {
			setLoading(true);

			// Update the plan work time only if the user changed it
			if (plan && plan.workTimePlanned !== workTimePlanned) {
				await updateDailyPlan({ workTimePlanned }, plan.id ?? '');
			}

			startTimer();

			handleCloseModal();
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}, [handleCloseModal, plan, startTimer, updateDailyPlan, workTimePlanned]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} showCloseIcon>
			<EverCard className="w-full" shadow="custom">
				<div className="flex flex-col justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							{t('timer.todayPlanSettings.TITLE')}
						</Text.Heading>
						<div className="flex flex-col w-full gap-4 mb-7">
							<span className="text-sm">
								{t('timer.todayPlanSettings.WORK_TIME_PLANNED')} <span className="text-red-600">*</span>
							</span>

							<InputField
								type="number"
								placeholder={t('timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER')}
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								onChange={(e) => setworkTimePlanned(parseFloat(e.target.value))}
								required
								min={0}
								value={workTimePlanned}
								defaultValue={plan.workTimePlanned ?? 0}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between mt-6">
						<Button
							variant="outline"
							type="submit"
							className="py-3 px-5 min-w-[10rem] rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
							onClick={handleCloseModal}
						>
							{t('common.SKIP_ADD_LATER')}
						</Button>
						<Button
							variant="default"
							type="submit"
							disabled={loading || (requirePlan && !hasWorkHours)}
							className="py-3 px-5 min-w-[10rem] rounded-md font-light text-md dark:text-white"
							onClick={handleSubmit}
						>
							{loading ? (
								<SpinnerLoader variant="light" size={20} />
							) : (
								t('timer.todayPlanSettings.START_WORKING_BUTTON')
							)}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
