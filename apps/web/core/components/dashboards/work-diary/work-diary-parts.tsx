'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useReachText } from '@/core/components/calendar/calendar-month-view';
import { type MetricItem, MetricStrip } from '@/core/components/dashboards/kit/metric-strip';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { TaskTitle } from '@/core/components/dashboards/timesheets/timesheet-log-row';
import { cn } from '@/core/lib/helpers';
import type { CalendarDay } from '@/core/lib/utils/calendar-view';
import { formatDurationShort, formatPercent, shareRowsOf } from '@/core/lib/utils/dashboard-figures';
import { type AppActivity, type AppShare, appSharesOf } from '@/core/lib/utils/dashboards/app-activity';
import type { DiaryDay, DiaryTask } from '@/core/lib/utils/dashboards/work-diary';

/** The tasks, plan and apps of a day, side by side on a wide screen and one under the other on a phone. */
export const DIARY_COLUMNS = 'grid gap-4 lg:grid-cols-3 lg:items-start';

/** The rows a list shows before it gathers the rest in one "N other" row. */
const LEADING_ROWS = 6;

const SKELETON_ROWS = 3;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROWS }, (_, index) => `row-${index}`);

type DiaryFigureKey = 'tracked' | 'activity' | 'tasks' | 'screenshots';

/** The day in four figures: the time tracked (against the plan, when there is one), activity, tasks, screenshots. */
export function DiaryFigures({
	day,
	diary,
	taskCount,
	isLoading
}: Readonly<{ day: CalendarDay; diary: DiaryDay; taskCount: number; isLoading: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const reach = useReachText(day);
	const activity = diary.activityPercent === null ? '–' : formatPercent(diary.activityPercent, locale);
	const items: MetricItem<DiaryFigureKey>[] = [
		{
			key: 'tracked',
			label: t('dashboard.timesheets.diary.TRACKED'),
			value: formatDurationShort(day.trackedSeconds),
			hint: reach ?? undefined
		},
		{ key: 'activity', label: t('dashboard.timesheets.diary.ACTIVITY'), value: activity },
		{ key: 'tasks', label: t('common.TASKS'), value: taskCount },
		{ key: 'screenshots', label: t('common.SCREENSHOTS'), value: diary.shotCount }
	];
	return <MetricStrip items={items} isLoading={isLoading} ariaLabel={t('dashboard.workDiary.FIGURES_LABEL')} />;
}

/** The place of a list of rows while it loads. */
export function DiaryRowsSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col gap-4 px-4 py-3">
			{SKELETON_ROW_KEYS.map((rowKey) => (
				<li key={rowKey} className="flex items-center gap-3">
					<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					<span className={cn('h-2.5 flex-1', SKELETON_BAR)} />
					<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

const NOTES_SEPARATOR = ' · ';

/** The task (it opens), "now" while its timer runs, its project on a second line, then the notes of its entries. */
function DiaryTaskName({ task }: Readonly<{ task: DiaryTask }>) {
	const t = useTranslations();
	const notes = task.notes.join(NOTES_SEPARATOR);
	const hasNotes = notes !== '';
	return (
		<span className="flex min-w-0 flex-col py-0.5">
			<span className="flex min-w-0 items-baseline gap-1.5">
				<TaskTitle log={task.log} />
				{task.isRunning && (
					<span className="shrink-0 text-xs font-medium text-success">
						{t('dashboard.timesheets.RUNNING')}
					</span>
				)}
			</span>
			{task.projectName && <span className="truncate text-xs text-muted-foreground">{task.projectName}</span>}
			{hasNotes && (
				<span title={notes} className="truncate text-xs text-muted-foreground">
					<span className="sr-only">{t('common.NOTES')}: </span>
					{notes}
				</span>
			)}
		</span>
	);
}

function renderTaskName(task: DiaryTask) {
	return <DiaryTaskName task={task} />;
}

/** No "other" row: every task of the day keeps its name and its link. */
function noOtherRow() {
	return '';
}

/**
 * Where the day's time went, task by task: its share of the day, the task (it opens), its project, its time. Every
 * task is listed, however short: a day holds few enough of them, and each one opens. `renderActions` puts a task's
 * own actions at the end of its name.
 */
export function DiaryTaskRows({
	tasks,
	renderActions
}: Readonly<{ tasks: ReadonlyArray<DiaryTask>; renderActions?: (task: DiaryTask) => ReactNode }>) {
	const rows = useMemo(
		() =>
			shareRowsOf(
				tasks,
				(task) => task.seconds,
				(task) => task.key,
				tasks.length
			),
		[tasks]
	);
	let renderName = renderTaskName;
	if (renderActions) {
		renderName = (task: DiaryTask) => (
			<>
				<span className="min-w-0 flex-1">
					<DiaryTaskName task={task} />
				</span>
				{renderActions(task)}
			</>
		);
	}
	return (
		<ShareRows
			rows={rows}
			renderName={renderName}
			formatValue={formatDurationShort}
			otherLabel={noOtherRow}
			className="py-1.5"
			density="narrow"
		/>
	);
}

/** The app or site, and the window it spent the most time in on a second line. */
function AppName({ share }: Readonly<{ share: AppShare }>) {
	return (
		<span className="flex min-w-0 flex-col py-0.5">
			<span className="truncate">{share.title}</span>
			{share.detail && <span className="truncate text-xs text-muted-foreground">{share.detail}</span>}
		</span>
	);
}

function renderAppName(share: AppShare) {
	return <AppName share={share} />;
}

/** The apps and sites of the day, longest first, the rest in one row; what the desktop app or the agent recorded. */
export function DiaryAppRows({
	activities,
	isLoading,
	dayText
}: Readonly<{ activities: ReadonlyArray<AppActivity>; isLoading: boolean; dayText: string }>) {
	const t = useTranslations();
	const rows = useMemo(
		() =>
			shareRowsOf(
				appSharesOf(activities),
				(share) => share.seconds,
				(share) => share.key,
				LEADING_ROWS
			),
		[activities]
	);
	if (isLoading) {
		return <DiaryRowsSkeleton />;
	}
	if (rows.length === 0) {
		return (
			<p className="px-4 py-3 text-xs text-muted-foreground text-pretty">
				{t('dashboard.workDiary.APPS_EMPTY', { day: dayText })}
			</p>
		);
	}
	return (
		<ShareRows
			rows={rows}
			renderName={renderAppName}
			formatValue={formatDurationShort}
			otherLabel={(count) => t('dashboard.appsUrls.day.OTHER', { count })}
			className="py-1.5"
			density="narrow"
		/>
	);
}
