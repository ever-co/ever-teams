import {
	Modal,
	SpinnerLoader,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { useCallback, useMemo, useState } from 'react';
import { DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { useTimerActions } from '@/core/hooks/timer';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useTranslations } from 'next-intl';
import { InputField } from '../../duplicated-components/_input';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';

interface IAddDailyPlanWorkHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan: TDailyPlan;
}

export function AddDailyPlanWorkHourModal(props: IAddDailyPlanWorkHoursModalProps) {
	const { closeModal, isOpen, plan } = props;

	const t = useTranslations();
	const { updateDailyPlan } = useUpdateDailyPlan();
	const { startTimer } = useTimerActions();

	const activeTeam = useAtomValue(activeTeamState);
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
				// Server requires employeeId in the payload, to correctly check permissions
				await updateDailyPlan({ workTimePlanned, employeeId: plan.employeeId || undefined }, plan.id ?? '');
			}

			// startTimer reports its own failure, this only keeps the rejection from going unhandled
			startTimer()?.catch(() => undefined);

			handleCloseModal();
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}, [handleCloseModal, plan, startTimer, updateDailyPlan, workTimePlanned]);

	return (
		<Modal
			isOpen={isOpen}
			closeModal={handleCloseModal}
			showCloseIcon
			title={t('timer.todayPlanSettings.TITLE')}
			breadcrumb={activeTeam?.name}
		>
			<div className="w-full">
				<div className="flex flex-col justify-between gap-5">
					<div>
						<div className="flex w-full flex-col gap-2">
							<span className={modalFieldLabelClass}>
								{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}{' '}
								<span className="text-destructive-ink">*</span>
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
					<div className={modalFooterClass}>
						<Button
							variant="ghost"
							size="default"
							type="submit"
							className={modalSecondaryActionClass}
							onClick={handleCloseModal}
						>
							{t('common.SKIP_ADD_LATER')}
						</Button>
						<Button
							variant="default"
							size="default"
							type="submit"
							disabled={loading || (requirePlan && !hasWorkHours)}
							className={modalPrimaryActionClass}
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
			</div>
		</Modal>
	);
}
