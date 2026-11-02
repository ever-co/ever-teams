'use client';
import {
	Modal,
	Button,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import Separator from '@/core/components/common/separator';
import { TaskNameInfoDisplay } from '../../tasks/task-displays';
import { clsxm } from '@/core/lib/utils';
import { useMemberIdentity, useMemberActiveTask, useTMCardTaskEdit } from '@/core/hooks';
import { useTimerActions } from '@/core/hooks/timer';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { dailyPlanCompareEstimated } from '@/core/lib/helpers/daily-plan-estimated';
import { secondsToTime } from '@/core/lib/helpers/index';
import { DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { IconsErrorWarningFill } from '@/core/components/icons';
import { TaskEstimateInput } from '../../pages/teams/team/team-members-views/user-team-card/task-estimate';
import { TimePicker, TimePickerValue } from '../../duplicated-components/time-picker';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export interface IDailyPlanCompareEstimated {
	difference?: boolean;
	workTimePlanned?: number;
	estimated?: boolean[] | undefined;
	plan?: TDailyPlan | undefined;
}
export function DailyPlanCompareEstimatedModal({
	open,
	closeModal,
	todayPlan,
	profile
}: {
	open: boolean;
	closeModal: () => void;
	todayPlan: TDailyPlan[];
	profile: any;
}) {
	const t = useTranslations();
	const { difference, workTimePlanned, estimated, plan } = dailyPlanCompareEstimated(todayPlan);
	const { updateDailyPlan, updateDailyPlanLoading } = useUpdateDailyPlan();
	const { hours: dh, minutes: dm } = secondsToTime(workTimePlanned || 0);
	const { startTimer } = useTimerActions();
	const hour = dh.toString()?.padStart(2, '0');
	const minute = dm.toString()?.padStart(2, '0');
	const [times, setTimes] = useState<TimePickerValue>({
		hours: workTimePlanned ? (workTimePlanned / 3600).toString() : '--',
		meridiem: 'PM',
		minute: '--'
	});

	const onClick = () => {
		updateDailyPlan({ workTimePlanned: parseInt(times.hours) }, plan?.id ?? '');
		if (!updateDailyPlanLoading) {
			// startTimer reports its own failure, this only keeps the rejection from going unhandled
			startTimer()?.catch(() => undefined);
			closeModal();
			window.localStorage.setItem(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE, new Date().toISOString().split('T')[0]);
		}
	};

	return (
		<Modal isOpen={open} closeModal={closeModal} title={t('modals.dailyPlan.todayPlanTitle')}>
			<div className="w-[98%] md:w-[550px] relative">
				<div className="w-full h-[620px] flex flex-col justify-start">
					<div className="flex flex-col justify-between items-center">
						<DailyPlanCompareHeader />
					</div>
					<div className="flex flex-col justify-start items-start px-2 w-full">
						<TimePicker
							defaultValue={{
								hours: hour,
								meridiem: 'AM',
								minute: minute
							}}
							onChange={(value) => setTimes(value)}
						/>
						<DailyPlanWorkTimeInput />
					</div>

					<ScrollArea className="flex flex-col p-2 w-full h-full">
						{todayPlan.map((plan, i) => {
							return (
								<div key={i}>
									{plan.tasks?.map((data, index) => {
										return (
											<div key={index} className="p-1">
												<DailyPlanTask key={index} task={data} profile={profile} />
											</div>
										);
									})}
								</div>
							);
						})}
					</ScrollArea>
					<div className="flex flex-col">
						<div className="flex items-center pb-2 text-xs text-destructive-ink">
							{!difference && !estimated?.every(Boolean) && (
								<>
									<IconsErrorWarningFill className="text-[14px]" />
									<span>{t('modals.dailyPlan.correctHoursWarning')}</span>
								</>
							)}
						</div>
						<DailyPlanCompareActionButton
							loading={updateDailyPlanLoading}
							closeModal={closeModal}
							onClick={onClick}
							disabled={updateDailyPlanLoading && (parseInt(times.hours) > 0 ? false : true)}
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
}

export function DailyPlanTask({ task, profile }: { task?: TTask; profile: any }) {
	const taskEdition = useTMCardTaskEdit(task);
	const member = task?.selectedTeam?.members?.find((member) => {
		return member?.employee?.user?.id === profile?.userProfile?.id;
	});

	// Only identity + memberTask needed — TaskEstimateInput consumes memberTask, isAuthUser, isAuthTeamManager
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);

	return (
		<div className="flex justify-between items-center px-1 w-full h-16 font-normal bg-card rounded-lg hairline-ring ring-border">
			<div className="flex items-center space-x-1 w-full">
				<TaskNameInfoDisplay
					task={task}
					className={clsxm('text-2xl')}
					taskTitleClassName={clsxm(
						'pr-1 w-full text-[12px] text-ellipsis text-inherit leading-4 capitalize font-medium'
					)}
					showSize={true}
					dash={true}
				/>
			</div>
			<Separator />
			<div className="flex items-center pl-1 w-2/3 text-[12px]">
				<TaskEstimateInput
					type="HORIZONTAL"
					showTime={true}
					memberInfo={memberInfo}
					edition={taskEdition}
					fullWidth
				/>
			</div>
		</div>
	);
}

export function DailyPlanCompareActionButton({
	closeModal,
	onClick,
	loading,
	disabled
}: {
	closeModal?: () => void;
	onClick?: () => void;
	loading?: boolean;
	disabled: boolean;
}) {
	const t = useTranslations();
	return (
		<div className={modalFooterClass}>
			<Button onClick={closeModal} variant="ghost" size="default" className={modalSecondaryActionClass}>
				{t('common.CANCEL')}
			</Button>
			<Button
				disabled={disabled}
				loading={loading}
				onClick={onClick}
				size="default"
				className={modalPrimaryActionClass}
			>
				{t('timer.todayPlanSettings.START_WORKING_BUTTON')}
			</Button>
		</div>
	);
}

export function DailyPlanCompareHeader() {
	const t = useTranslations();
	return (
		<div className="mb-2 flex w-full items-center justify-start px-2">
			<span className={modalFieldLabelClass}>
				{t('modals.dailyPlan.addPlannedHours')}
				<span className="ml-1 text-destructive-ink">*</span>
			</span>
		</div>
	);
}

export function DailyPlanWorkTimeInput() {
	const t = useTranslations();
	return (
		<>
			<div className="flex items-center space-x-1 w-auto">
				<span className={modalFieldLabelClass}>
					{t('modals.dailyPlan.tasksWithoutEstimate')}
					<span className="ml-1 text-destructive-ink">*</span>
				</span>
			</div>
		</>
	);
}
