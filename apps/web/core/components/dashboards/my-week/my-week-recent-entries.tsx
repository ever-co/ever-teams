'use client';

import { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { ProjectMark } from '@/core/components/dashboards/team/team-marks';
import { TaskTitle } from '@/core/components/dashboards/timesheets/timesheet-log-row';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { type MyWeekEntry, type MyWeekEntryProject, taskIdOfEntry } from '@/core/lib/utils/dashboards/my-week';
import {
	relativeDayOf,
	type TimesheetFormatters,
	timeRangeTextOf,
	timesheetFormattersOf
} from '@/core/lib/utils/dashboards/timesheets';
import { teamTasksState } from '@/core/stores/teams/team-tasks';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type Translate = ReturnType<typeof useTranslations>;

const START_SLOT = 'flex size-7 shrink-0 items-center justify-center';

/** The task card's timer controller and its dialogs, loaded once the first entry that can start is on screen. */
const MyWeekEntryStart = dynamic(() => import('./my-week-entry-start').then((module) => module.MyWeekEntryStart), {
	ssr: false,
	loading: () => <span aria-hidden="true" className="size-7 animate-pulse rounded-full bg-foreground/[0.06]" />
});

const ROW = 'grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-1.5';

const ROW_WITH_START = 'grid min-h-12 grid-cols-[minmax(0,1fr)_auto_1.75rem] items-center gap-x-3 px-4 py-1.5';

function rowClassOf(showsStart: boolean) {
	if (showsStart) {
		return ROW_WITH_START;
	}
	return ROW;
}

function dayTextOf(start: Date, formatters: TimesheetFormatters, t: Translate) {
	const relativeDay = relativeDayOf(start);
	if (relativeDay === 'today') {
		return t('common.TODAY');
	}
	if (relativeDay === 'yesterday') {
		return t('common.YESTERDAY');
	}
	return t('dashboard.timesheets.DAY_LABEL', {
		day: formatters.weekdayShort(start),
		date: formatters.dayDate(start)
	});
}

function EntryProject({ project }: Readonly<{ project: MyWeekEntryProject }>) {
	return (
		<>
			<ProjectMark imageUrl={project.imageUrl} color={project.color} isNoProject={false} />
			<span className="min-w-0 max-w-[45%] truncate">{project.name}</span>
			<span aria-hidden="true">·</span>
		</>
	);
}

/** A running entry has no end yet: its range reads up to now, whatever end the API last recorded for it. */
function rangeTextOf(entry: MyWeekEntry, formatters: TimesheetFormatters, runningLabel: string) {
	if (entry.isRunning) {
		const startText = formatters.time(entry.start);
		return `${startText} – ${runningLabel}`;
	}
	return timeRangeTextOf(entry.log, formatters, runningLabel);
}

const RecentEntryRow = memo(function RecentEntryRow({
	entry,
	task,
	showsStart,
	formatters
}: Readonly<{ entry: MyWeekEntry; task: TTask | null; showsStart: boolean; formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const dayText = dayTextOf(entry.start, formatters, t);
	const rangeText = rangeTextOf(entry, formatters, runningLabel);
	return (
		<li className={rowClassOf(showsStart)}>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="flex min-w-0 text-[13px]">
					<TaskTitle log={entry.log} />
				</span>
				<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					{entry.project && <EntryProject project={entry.project} />}
					<span className="min-w-0 truncate tabular-nums">{`${dayText} · ${rangeText}`}</span>
				</span>
			</span>
			<span className="text-[13px] font-medium tabular-nums text-foreground">
				{formatDurationShort(entry.seconds)}
			</span>
			{showsStart && <span className={START_SLOT}>{task && <MyWeekEntryStart task={task} />}</span>}
		</li>
	);
});

function tasksByIdOf(tasks: ReadonlyArray<TTask>) {
	const byId = new Map<string, TTask>();
	for (const task of tasks) {
		byId.set(task.id, task);
	}
	return byId;
}

/** Only a task of the active team's list can be started: the timer runs in that team, on a task it knows whole. */
function taskToStartOf(entry: MyWeekEntry, tasksById: ReadonlyMap<string, TTask>) {
	const taskId = taskIdOfEntry(entry);
	if (!taskId) {
		return null;
	}
	return tasksById.get(taskId) ?? null;
}

function metaOf(shownCount: number, entryCount: number, t: Translate) {
	const isCapped = entryCount > shownCount;
	if (isCapped) {
		return t('dashboard.myWeek.RECENT_LATEST', { shown: shownCount, total: entryCount });
	}
	return t('dashboard.calendar.ENTRY_COUNT', { count: entryCount });
}

/** Where the member may track time, an entry on a task of the active team starts the timer on it, as its card would. */
export function MyWeekRecentEntries({
	entries,
	entryCount,
	canTrackTime
}: Readonly<{ entries: ReadonlyArray<MyWeekEntry>; entryCount: number; canTrackTime: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const teamTasks = useAtomValue(teamTasksState);
	const tasksById = useMemo(() => tasksByIdOf(teamTasks), [teamTasks]);
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);
	const title = t('dashboard.myWeek.RECENT_TITLE');
	return (
		<DashboardSection title={title} meta={metaOf(entries.length, entryCount, t)} ariaLabel={title}>
			<ul className="flex flex-col pb-2">
				{entries.map((entry) => (
					<RecentEntryRow
						key={entry.id}
						entry={entry}
						task={taskToStartOf(entry, tasksById)}
						showsStart={canTrackTime}
						formatters={formatters}
					/>
				))}
			</ul>
		</DashboardSection>
	);
}
