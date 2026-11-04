import { useMemo } from 'react';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

const SUMMARY_SURFACE =
	'overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

const FIGURE_CELL = 'flex min-w-0 flex-col justify-center gap-1 px-4 py-3';

const FIGURE_LABEL = 'text-xs text-muted-foreground';

const FIGURE_VALUE = 'text-lg font-semibold tabular-nums text-foreground';

const LEGEND_ITEM = 'flex min-w-0 items-center gap-2 px-4 py-2.5 text-[13px]';

/**
 * The summary keeps one fixed height whatever the number of tasks: the three longest tasks get a colour in the share
 * bar and a slot in the legend, every other task is merged into one grey segment and one "N other tasks" slot. The
 * full list lives in the Tasks tab right below.
 */
const LEGEND_TASK_COUNT = 3;
const SHARE_TONES = ['bg-primary', 'bg-primary/60', 'bg-primary/30'];
const REMAINING_SHARE_TONE = 'bg-foreground/15';

function shareToneOf(index: number) {
	return SHARE_TONES[index] ?? REMAINING_SHARE_TONE;
}

function durationLabelOf(seconds: number) {
	const { hours, minutes } = secondsToTime(seconds);
	return `${hours}h ${minutes}m`;
}

function totalDurationOf(tasks: TTaskStatistic[]) {
	return tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
}

const NO_VALUE = '–';

function exactShareOf(duration: number, totalSeconds: number) {
	if (!totalSeconds) {
		return 0;
	}
	return (duration / totalSeconds) * 100;
}

/** The stacked bar: one segment per leading task, then every other task merged into a single grey segment. */
function shareSegmentsOf(tasks: TTaskStatistic[], totalSeconds: number) {
	const leadingTasks = tasks.slice(0, LEGEND_TASK_COUNT);
	const otherTasks = tasks.slice(LEGEND_TASK_COUNT);
	const segments = leadingTasks.map((task, index) => ({
		key: task.id,
		tone: shareToneOf(index),
		width: exactShareOf(task.duration || 0, totalSeconds)
	}));
	const otherDuration = totalDurationOf(otherTasks);
	if (otherDuration > 0) {
		segments.push({
			key: 'other-tasks',
			tone: REMAINING_SHARE_TONE,
			width: exactShareOf(otherDuration, totalSeconds)
		});
	}
	return segments;
}

function byLongestDuration(first: TTaskStatistic, second: TTaskStatistic) {
	return (second.duration || 0) - (first.duration || 0);
}

function activityValueOf(activityPercent: number | null) {
	if (activityPercent === null) {
		return NO_VALUE;
	}
	return `${Math.round(activityPercent)}%`;
}

interface TodayWorkedTasksProps {
	memberId?: string;
	/** The member's average activity over today's time slots, null when no slot was recorded. */
	activityPercent: number | null;
	showsTasks: boolean;
}

/**
 * Today at a glance for a team member: the three figures of the day (activity, worked time, tasks) in one strip,
 * then each worked task with its share of the day as a bar. Read from the member's `totalTodayTasks`, so the total
 * matches the one on the member card.
 */
export function TodayWorkedTasks({ memberId, activityPercent, showsTasks }: Readonly<TodayWorkedTasksProps>) {
	const t = useTranslations();
	const { hours, minutes, totalSeconds, currentMember } = useTodayWorkedTime({ id: memberId });

	const tasks = useMemo<TTaskStatistic[]>(
		() => [...(currentMember?.totalTodayTasks ?? [])].sort(byLongestDuration),
		[currentMember?.totalTodayTasks]
	);
	const hasActivity = activityPercent !== null;
	const activityBarWidth = `${Math.round(activityPercent ?? 0)}%`;
	const showsTaskRows = showsTasks && tasks.length > 0;
	const shareSegments = shareSegmentsOf(tasks, totalSeconds);
	const legendTasks = tasks.slice(0, LEGEND_TASK_COUNT);
	const otherTasks = tasks.slice(LEGEND_TASK_COUNT);
	const hasOtherTasks = otherTasks.length > 0;
	const otherDurationLabel = durationLabelOf(totalDurationOf(otherTasks));

	return (
		<section className={SUMMARY_SURFACE}>
			<div className="grid grid-cols-3 hairline-divide-x divide-dashed divide-border">
				<div className={FIGURE_CELL}>
					<span className={FIGURE_LABEL}>{t('timer.TIME_ACTIVITY')}</span>
					<span className={FIGURE_VALUE}>{activityValueOf(activityPercent)}</span>
					{hasActivity && (
						<span className="h-1 w-full max-w-40 overflow-hidden rounded-full bg-foreground/[0.06]">
							<span
								className="block h-full rounded-full bg-primary"
								style={{ width: activityBarWidth }}
							/>
						</span>
					)}
				</div>
				<div className={FIGURE_CELL}>
					<span className={FIGURE_LABEL}>{t('common.TOTAL_WORKED_TODAY')}</span>
					<span className={FIGURE_VALUE}>
						{hours}h {minutes}m
					</span>
				</div>
				<div className={FIGURE_CELL}>
					<span className={FIGURE_LABEL}>{t('common.TASKS')}</span>
					<span className={FIGURE_VALUE}>{tasks.length}</span>
				</div>
			</div>

			{showsTaskRows && (
				<div className="hairline-t border-dashed border-border">
					<div className="flex h-1.5 w-full gap-px overflow-hidden" aria-hidden="true">
						{shareSegments.map((segment) => (
							<span key={segment.key} className={segment.tone} style={{ width: `${segment.width}%` }} />
						))}
					</div>
					<ul className="grid grid-cols-2 hairline-divide-x divide-dashed divide-border lg:grid-cols-4">
						{legendTasks.map((task, index) => (
							<li key={task.id} className={LEGEND_ITEM}>
								<span className={cn('size-2 shrink-0 rounded-[3px]', shareToneOf(index))} />
								<span className="min-w-0 flex-1 truncate text-foreground" title={task.title}>
									{task.title}
								</span>
								<span className="shrink-0 tabular-nums text-muted-foreground">
									{durationLabelOf(task.duration || 0)}
								</span>
							</li>
						))}
						{hasOtherTasks && (
							<li className={LEGEND_ITEM}>
								<span className={cn('size-2 shrink-0 rounded-[3px]', REMAINING_SHARE_TONE)} />
								<span className="min-w-0 flex-1 truncate text-muted-foreground">
									{t('todayActivity.OTHER_TASKS', { count: otherTasks.length })}
								</span>
								<span className="shrink-0 tabular-nums text-muted-foreground">
									{otherDurationLabel}
								</span>
							</li>
						)}
					</ul>
				</div>
			)}
		</section>
	);
}
