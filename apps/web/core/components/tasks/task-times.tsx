import { secondsToTime } from '@/core/lib/helpers/index';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { Nullable } from '@/core/types/generics/utils';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Tooltip } from '../duplicated-components/tooltip';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useActiveTeamMember } from '@/core/hooks/organizations/teams/use-active-team-member';
import { useTodaySecondsWithoutTeam } from '@/core/hooks/organizations/teams/use-today-seconds-without-team';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

/**
 * Lightweight type for TaskTimes/TodayWorkedTime — only needs member.id to find currentMember in activeTeam.
 * Accepts I_MemberIdentityHook or any object with { member?: { id } } thanks to structural typing.
 */
type TaskTimesMemberInfo = {
	member?: TOrganizationTeamEmployee | null;
	id?: string; // Legacy fallback for IEmployee-shaped objects
};

type Props = {
	task: Nullable<TTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	memberInfo?: TaskTimesMemberInfo;
	showDaily?: boolean;
	showTotal?: boolean;
	isBlock?: boolean;
	/** Sizes the values of the time lines (not the block layout), for a denser row. */
	valueClassName?: string;
} & IClassName;

export function TaskTimes({
	className,
	task,
	memberInfo,
	showDaily = true,
	showTotal = true,
	isBlock = false,
	valueClassName
}: Props) {
	// For public page

	const currentMember = useActiveTeamMember(memberInfo?.member?.id, memberInfo?.id);

	const { hours: h, minutes: m } = useMemo(
		() =>
			secondsToTime(
				(currentMember?.totalWorkedTasks &&
					currentMember?.totalWorkedTasks?.length &&
					currentMember?.totalWorkedTasks
						.filter((t: TTask) => t.id === task?.id)
						.reduce(
							(previousValue: number, currentValue: TTaskStatistic) =>
								previousValue + (currentValue?.duration || 0),
							0
						)) ||
					0
			),
		[currentMember?.totalWorkedTasks, task?.id]
	);

	const { hours: dh, minutes: dm } = useMemo(
		() =>
			secondsToTime(
				(currentMember?.totalTodayTasks &&
					currentMember?.totalTodayTasks.length &&
					currentMember?.totalTodayTasks
						.filter((t: TTask) => t.id === task?.id)
						.reduce(
							(previousValue: number, currentValue: TTaskStatistic) =>
								previousValue + (currentValue?.duration || 0),
							0
						)) ||
					0
			),
		[currentMember?.totalTodayTasks, task?.id]
	);

	return (
		<div className={clsxm('min-w-0', className)}>
			{isBlock ? (
				<TimeBlockInfo
					showDaily={showDaily}
					showTotal={showTotal}
					currentUser={currentMember}
					task={task}
					daily={{ h: dh, m: dm }}
					total={{ h, m }}
				/>
			) : (
				<TimeInfo
					currentUser={currentMember}
					showDaily={showDaily}
					showTotal={showTotal}
					daily={{ h: dh, m: dm }}
					total={{ h, m }}
					task={task}
					valueClassName={valueClassName}
				/>
			)}
		</div>
	);
}

/** Label and value of a time line: one muted label column of fixed width, values in the same size, so the lines align. */
const TIME_LINE = 'flex items-baseline gap-2.5 whitespace-nowrap';
const TIME_LABEL = 'min-w-10 shrink-0 text-xs capitalize text-muted-foreground';
const TIME_VALUE = 'text-[13px] font-medium tabular-nums text-foreground';

function TimeInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true,
	valueClassName
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
	currentUser: TOrganizationTeamEmployee | undefined;
	task: Nullable<TTask>;
	valueClassName?: string;
}) {
	const t = useTranslations();
	const valueClass = clsxm(TIME_VALUE, valueClassName);

	return (
		<>
			{showDaily && (
				<div className={TIME_LINE}>
					<span className={TIME_LABEL}>{t('common.TODAY')}</span>
					<Text className={valueClass}>
						{daily.h}h {daily.m}m
					</Text>
				</div>
			)}

			{showTotal && (
				<div className={TIME_LINE}>
					<span className={TIME_LABEL}>{t('common.TOTAL')}</span>
					<Text className={valueClass}>
						{total.h}h {total.m}m
					</Text>
				</div>
			)}
		</>
	);
}

function TimeBlockInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true,
	currentUser,
	task
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
	currentUser: TOrganizationTeamEmployee | undefined;
	task: Nullable<TTask>;
}) {
	const t = useTranslations();
	return (
		<div className="flex gap-1">
			{showDaily && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TODAY_ON_TASK_TOOLTIP')} ${daily.h}h ${daily.m}m`}
				>
					<div className="flex flex-col items-center gap-0.5 font-normal">
						<span className="text-muted-foreground text-center text-xs capitalize">
							{t('common.WORKED_ON_TASK')} {t('common.TODAY')}
						</span>
						<Text className="text-sm font-medium tabular-nums">
							{daily.h}h {daily.m}m
						</Text>
					</div>
				</Tooltip>
			)}

			{showTotal && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TOTAL_ON_TASK_TOOLTIP')} ${total.h}h ${total.m}m`}
				>
					<div
						className={clsxm(
							'font-normal flex flex-col items-center gap-0.5'
							// showDaily && ['text-sm']
						)}
					>
						<span className="text-muted-foreground text-center text-xs capitalize">
							{t('common.WORKED_ON_TASK')} {t('common.TOTAL')}
						</span>
						<Text className="text-sm font-medium tabular-nums">
							{total.h}h {total.m}m
						</Text>
					</div>
				</Tooltip>
			)}
		</div>
	);
}

function sumTodayTasksSeconds(todayTasks: TTaskStatistic[] | undefined): number {
	let total = 0;
	for (const taskStatistic of todayTasks ?? []) {
		total += taskStatistic?.duration || 0;
	}
	return total;
}

export function TodayWorkedTime({ className, memberInfo }: Omit<Props, 'task' | 'activeAuthTask'>) {
	// Get current timer seconds

	const currentMember = useActiveTeamMember(memberInfo?.member?.id);
	const secondsWithoutTeam = useTodaySecondsWithoutTeam(currentMember?.employeeId);
	const todayTasksSeconds = sumTodayTasksSeconds(currentMember?.totalTodayTasks);
	const todaySeconds = todayTasksSeconds + secondsWithoutTeam;
	const { hours: h, minutes: m } = secondsToTime(todaySeconds);

	return (
		<div className={clsxm('font-normal text-center', className)}>
			<Text className="tabular-nums">
				{h}h {m}m
			</Text>
		</div>
	);
}
