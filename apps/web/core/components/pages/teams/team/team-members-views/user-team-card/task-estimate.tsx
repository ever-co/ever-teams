'use client';

import { mergeRefs, secondsToTime } from '@/core/lib/helpers/index';
import { I_TMCardTaskEditHook } from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTeamManagerRole } from '@/core/hooks/organizations/teams/use-team-member';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { SpinnerLoader, Text } from '@/core/components';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { checkPastDate } from '@/core/lib/helpers';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { TaskProgressBar } from '@/core/components/tasks/task-progress-bar';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * Lightweight type — only the properties actually consumed by TaskEstimateInfo / TaskEstimateInput.
 * Accepts I_TeamMemberCardHook (superset) transparently thanks to structural typing.
 */
type TaskEstimateMemberInfo = {
	memberTask: TTask | null;
	isAuthUser: boolean;
	isAuthTeamManager: boolean;
};

type Props = IClassName & {
	memberInfo: TaskEstimateMemberInfo;
	edition: I_TMCardTaskEditHook;
	activeAuthTask: boolean;
	showTime?: boolean;
	radial?: boolean;
	plan?: TDailyPlan;
	allowEmptyTask?: boolean;
	useActiveTeamTaskByDefault?: boolean;
};

export function TaskEstimateInfo({
	className,
	activeAuthTask,
	showTime = true,
	radial = false,
	useActiveTeamTaskByDefault = true,
	allowEmptyTask = true,
	...rest
}: Props) {
	const { memberInfo, edition } = rest;
	const t = useTranslations();
	const loadingRef = useRef<boolean>(false);
	const task = edition.task || memberInfo.memberTask;
	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};

	return (
		<div className={className}>
			<div className="flex w-full flex-col justify-center gap-y-1">
				{showTime && (
					<div className="flex min-h-7 w-full min-w-0 items-center gap-2">
						<span className="shrink-0 text-xs text-muted-foreground">{t('common.ESTIMATED')}</span>
						<TaskEstimate
							_task={task}
							loadingRef={loadingRef}
							closeable_fc={closeFn}
							onOpenEdition={() => edition.setEstimateEditMode(true)}
							onCloseEdition={() => edition.setEstimateEditMode(false)}
							showEditAndSaveButton={
								allowEmptyTask ? memberInfo.isAuthUser || memberInfo.isAuthTeamManager : Boolean(task)
							}
							useActiveTeamTaskByDefault={useActiveTeamTaskByDefault}
						/>
					</div>
				)}

				<TaskProgressBar
					task={rest.edition.task || rest.memberInfo.memberTask}
					isAuthUser={rest.memberInfo.isAuthUser}
					activeAuthTask={activeAuthTask}
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
	// The signed-in user's role alone: the session hook would re-render this per-row cell on every team refresh
	const { data: authUser } = useUserQuery();
	const { isTeamManager } = useTeamManagerRole(authUser?.id);
	const hasEditMode = edition.estimateEditMode && task;

	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};
	edition.estimateEditIgnoreElement.onOutsideClick(closeFn);

	const { hours: h, minutes: m } = secondsToTime(task?.estimate || 0);

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
					'flex items-center gap-x-2 text-xs font-normal tabular-nums lg:text-sm',
					hasEditMode && ['hidden']
				)}
			>
				<span className="text-muted-foreground">{t('common.ESTIMATED')}:</span>
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
											'text-muted-foreground'
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
