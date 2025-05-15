'use client';

import { Modal, Text, Button } from '@/core/components';
import { useState } from 'react';
import Separator from '@/core/components/common/separator';
import { IDailyPlan, ITeamTask } from '@/core/types/interfaces';
import { TaskNameInfoDisplay } from '../tasks/task-displays';
import { clsxm } from '@/core/lib/utils';
import { useDailyPlan, useTeamMemberCard, useTimer, useTMCardTaskEdit } from '@/core/hooks';
import { dailyPlanCompareEstimated } from '@/core/lib/helpers/daily-plan-estimated';
import { secondsToTime } from '@/core/lib/helpers/index';
import { DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { IconsErrorWarningFill } from '@/core/components/icons';
import { TaskEstimateInput } from '../pages/teams/team/team-members-views/user-team-card/task-estimate';
import { TimePicker, TimePickerValue } from '../duplicated-components/time-picker';
import { Card } from '../duplicated-components/card';

export interface IDailyPlanCompareEstimated {
	difference?: boolean;
	workTimePlanned?: number;
	estimated?: boolean[] | undefined;
	plan?: IDailyPlan | undefined;
}
export function DailyPlanCompareEstimatedModal({
	open,
	closeModal,
	todayPlan,
	profile
}: {
	open: boolean;
	closeModal: () => void;
	todayPlan: IDailyPlan[];
	profile: any;
}) {
	const { difference, workTimePlanned, estimated, plan } = dailyPlanCompareEstimated(todayPlan);
	const { updateDailyPlan, updateDailyPlanLoading } = useDailyPlan();
	const { h: dh, m: dm } = secondsToTime(workTimePlanned || 0);
	const { startTimer } = useTimer();
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
			startTimer();
			closeModal();
			window.localStorage.setItem(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE, new Date().toISOString().split('T')[0]);
		}
	};

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<div className="w-[98%] md:w-[550px] relative">
				<Card className="w-full h-[620px] flex flex-col justify-start bg-gray-50" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<DailyPlanCompareHeader />
					</div>
					<div className="flex items-start flex-col justify-start w-full px-2">
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

					<ScrollArea className="flex h-full w-full p-2 flex-col">
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
						<div className="flex items-center pb-2 text-red-500 text-[12px]">
							{!difference && !estimated?.every(Boolean) && (
								<>
									<IconsErrorWarningFill className="text-[14px]" />
									<span>Please correct planned work hours or re-estimate task(s)</span>
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
				</Card>
			</div>
		</Modal>
	);
}

export function DailyPlanTask({ task, profile }: { task?: ITeamTask; profile: any }) {
	const taskEdition = useTMCardTaskEdit(task);
	const member = task?.selectedTeam?.members.find((member) => {
		return member?.employee?.user?.id === profile?.userProfile?.id;
	});

	const memberInfo = useTeamMemberCard(member);
	return (
		<div className="flex items-center w-full bg-white dark:bg-dark--theme-light border dark:border-gray-700 h-16  drop-shadow rounded-lg px-1 font-normal justify-between">
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
	return (
		<div className="flex items-center justify-between">
			<Button onClick={closeModal} variant="outline" className="font-normal rounded-sm text-md h-9">
				Cancel
			</Button>
			<Button
				disabled={disabled}
				loading={loading}
				onClick={onClick}
				className="font-normal rounded-sm text-md h-9"
			>
				Start working
			</Button>
		</div>
	);
}

export function DailyPlanCompareHeader() {
	return (
		<>
			<div>
				<Text.Heading as="h3" className="mb-3 text-center font-bold">
					TODAY&apos;S PLAN
				</Text.Heading>
			</div>
			<div className="flex items-center justify-start w-full px-2 mb-3">
				<div className="flex items-center space-x-1">
					<Text.Heading as="h4" className="mb-3 text-center text-gray-500 text-[12px]">
						Add planned working hours
					</Text.Heading>
					<Text.Heading as="h4" className="mb-3 text-center text-red-600">
						*
					</Text.Heading>
				</div>
			</div>
		</>
	);
}

export function DailyPlanWorkTimeInput() {
	return (
		<>
			<div className="flex items-center space-x-1 w-auto">
				<Text.Heading as="h4" className=" text-center text-gray-500 text-[12px]">
					Tasks with no time estimations
				</Text.Heading>
				<Text.Heading as="h4" className="text-center text-red-600">
					*
				</Text.Heading>
			</div>
		</>
	);
}
