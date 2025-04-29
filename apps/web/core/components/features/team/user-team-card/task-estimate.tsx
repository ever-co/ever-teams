'use client';

import { mergeRefs, secondsToTime } from '@app/helpers';
import { I_TMCardTaskEditHook, I_TeamMemberCardHook, useAuthenticateUser } from '@app/hooks';
import { IClassName, IDailyPlan } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { SpinnerLoader, Text } from '@/core/components';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { TaskEstimate, TaskProgressBar } from '@/core/components/features';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { checkPastDate } from 'lib/utils';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
	activeAuthTask: boolean;
	showTime?: boolean;
	radial?: boolean;
	plan?: IDailyPlan;
};

export function TaskEstimateInfo({ className, activeAuthTask, showTime = true, radial = false, ...rest }: Props) {
	const { memberInfo, edition } = rest;
	const t = useTranslations();
	const loadingRef = useRef<boolean>(false);
	const task = edition.task || memberInfo.memberTask;
	const hasEditMode = edition.estimateEditMode && task;
	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};

	return (
		<div className={className}>
			<div className="flex items-center flex-col gap-y-[2rem] w-full px-2 justify-center">
				{showTime && (
					<div className="flex space-x-2 items-center w-full font-normal lg:text-sm text-xs min-w-[120px]">
						<span className={clsxm('text-gray-500', hasEditMode && ['hidden'])}>
							{t('common.ESTIMATED')}:
						</span>
						<TaskEstimate
							_task={task}
							loadingRef={loadingRef}
							closeable_fc={closeFn}
							onOpenEdition={() => edition.setEstimateEditMode(true)}
							onCloseEdition={() => edition.setEstimateEditMode(false)}
							showEditAndSaveButton={memberInfo.isAuthUser || memberInfo.isAuthTeamManager}
						/>
					</div>
				)}

				<TaskProgressBar
					task={rest.edition.task || rest.memberInfo.memberTask}
					isAuthUser={rest.memberInfo.isAuthUser}
					activeAuthTask={activeAuthTask}
					memberInfo={rest.memberInfo}
					radial={radial}
				/>
			</div>
		</div>
	);
}

export function TaskEstimateInput({ memberInfo, edition, plan }: Omit<Props, 'className' | 'activeAuthTask'>) {
	const t = useTranslations();
	const loadingRef = useRef<boolean>(false);
	const task = edition.task || memberInfo.memberTask;
	const { isTeamManager } = useAuthenticateUser();
	const hasEditMode = edition.estimateEditMode && task;

	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};
	edition.estimateEditIgnoreElement.onOutsideClick(closeFn);

	const { h, m } = secondsToTime(task?.estimate || 0);

	return (
		<>
			<div
				className={clsxm(!hasEditMode ? ['hidden'] : 'flex items-center')}
				ref={edition.estimateEditIgnoreElement.ignoreElementRef}
			>
				{task && (
					<>
						<TaskEstimate
							_task={task}
							loadingRef={loadingRef}
							closeable_fc={closeFn}
							showEditAndSaveButton={false}
						/>
						<button
							className={`ml-2 ${loadingRef.current && 'hidden'}`}
							onClick={() => task && edition.setEstimateEditMode(false)}
						>
							<TickSaveIcon className="w-5" />
						</button>
					</>
				)}
			</div>

			<div
				className={clsxm(
					'flex space-x-2 items-center font-normal lg:text-sm text-xs',
					hasEditMode && ['hidden']
				)}
			>
				<span className="text-gray-500">{t('common.ESTIMATED')}:</span>
				<Text>
					{h}h {m}m
				</Text>

				{(memberInfo.isAuthUser || memberInfo.isAuthTeamManager) && (
					<>
						{(!checkPastDate(plan?.date) || isTeamManager) && (
							<button
								ref={mergeRefs([
									edition.estimateEditIgnoreElement.ignoreElementRef,
									edition.estimateEditIgnoreElement.targetEl
								])}
								onClick={() => task && edition.setEstimateEditMode(true)}
							>
								{loadingRef.current ? (
									<div className="">
										<SpinnerLoader size={12} />
									</div>
								) : (
									<EditPenBoxIcon
										className={clsxm(
											'cursor-pointer lg:h-4 lg:w-4 w-2 h-2',
											!task && ['opacity-40 cursor-default'],
											'dark:stroke-[#B1AEBC]'
										)}
									/>
								)}
							</button>
						)}
					</>
				)}
			</div>
		</>
	);
}
