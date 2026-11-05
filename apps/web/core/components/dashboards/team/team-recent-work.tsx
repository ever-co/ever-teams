'use client';

import { memo, type ReactNode, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { localDateOfKey, type RecentDay, type RecentLine } from '@/core/lib/utils/dashboards/team';
import { MemberFace } from './team-marks';
import { ProjectChip } from './team-project-chip';

type Translate = ReturnType<typeof useTranslations>;

const LINES_STEP = 8;

const SKELETON_LINES = 5;
const SKELETON_LINE_KEYS = Array.from({ length: SKELETON_LINES }, (_, index) => `line-${index}`);

const STRONG = 'font-medium text-foreground';

export interface DayFormats {
	weekday: Intl.DateTimeFormat;
	monthDay: Intl.DateTimeFormat;
}

export function dayFormatsOf(locale: string): DayFormats {
	return {
		weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
	};
}

function yesterdayKeyOf(now: Date) {
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	return localDayKeyOf(yesterday);
}

export function DayLabel({ dateKey, formats }: Readonly<{ dateKey: string; formats: DayFormats }>) {
	const t = useTranslations();
	const now = new Date();
	const todayKey = localDayKeyOf(now);
	const yesterdayKey = yesterdayKeyOf(now);
	if (dateKey === todayKey) {
		return <span className="font-semibold">{t('common.TODAY')}</span>;
	}
	if (dateKey === yesterdayKey) {
		return <span className="font-semibold">{t('common.YESTERDAY')}</span>;
	}
	const date = localDateOfKey(dateKey);
	return (
		<span>
			<span className="font-semibold">{formats.weekday.format(date)}</span>, {formats.monthDay.format(date)}
		</span>
	);
}

function taskTextOf(line: RecentLine) {
	if (!line.taskNumberLabel) {
		return line.taskTitle;
	}
	return `${line.taskNumberLabel} ${line.taskTitle}`;
}

function recentMemberNameOf(name: string, t: Translate) {
	if (name) {
		return name;
	}
	return t('dashboard.team.UNNAMED_MEMBER');
}

function TaskName({ line, children }: Readonly<{ line: RecentLine; children: ReactNode }>) {
	if (!line.taskId) {
		return <span className={STRONG}>{children}</span>;
	}
	return (
		<TaskDrawerLink
			taskId={line.taskId}
			prefetch={false}
			className={cn(STRONG, 'rounded-sm underline-offset-2 outline-none hover:underline focus-visible:underline')}
		>
			{children}
		</TaskDrawerLink>
	);
}

const RecentWorkLine = memo(function RecentWorkLine({ line }: Readonly<{ line: RecentLine }>) {
	const t = useTranslations();
	const name = recentMemberNameOf(line.name, t);
	const duration = formatDurationShort(line.seconds);
	const hasTask = Boolean(line.taskTitle);
	const strong = (chunks: ReactNode) => <span className={STRONG}>{chunks}</span>;
	const task = (chunks: ReactNode) => <TaskName line={line}>{chunks}</TaskName>;
	let sentence = t.rich('dashboard.team.recent.LINE_NO_TASK', { name, duration, strong });
	if (hasTask) {
		const taskText = taskTextOf(line);
		sentence = t.rich('dashboard.team.recent.LINE', { name, duration, task: taskText, strong, link: task });
	}
	return (
		<li className="flex min-w-0 items-start gap-2.5 px-4 py-2">
			<MemberFace name={name} imageUrl={line.imageUrl} className="mt-0.5 size-6 text-[10px]" />
			<div className="flex min-w-0 flex-col gap-1">
				<p className="text-[13px] text-muted-foreground text-pretty">{sentence}</p>
				{line.project && <ProjectChip project={line.project} className="self-start" />}
			</div>
		</li>
	);
});

interface VisibleDay {
	day: RecentDay;
	lines: RecentLine[];
}

export function visibleDaysOf(days: ReadonlyArray<RecentDay>, limit: number) {
	const visible: VisibleDay[] = [];
	let remaining = limit;
	for (const day of days) {
		if (remaining <= 0) {
			break;
		}
		const lines = day.lines.slice(0, remaining);
		remaining -= lines.length;
		visible.push({ day, lines });
	}
	return visible;
}

export function lineCountOf(days: ReadonlyArray<RecentDay>) {
	let count = 0;
	for (const day of days) {
		count += day.lines.length;
	}
	return count;
}

function RecentFrame({ children }: Readonly<{ children: ReactNode }>) {
	const t = useTranslations();
	const title = t('dashboard.team.recent.TITLE');
	return (
		<DashboardSection title={title} ariaLabel={title}>
			{children}
		</DashboardSection>
	);
}

export function TeamRecentWorkSkeleton() {
	return (
		<RecentFrame>
			<ul aria-hidden="true" className="py-2">
				{SKELETON_LINE_KEYS.map((slotKey) => (
					<li key={slotKey} className="flex items-start gap-2.5 px-4 py-2">
						<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="flex flex-1 flex-col gap-1.5 pt-1">
							<span className={cn('h-2.5 w-11/12', SKELETON_BAR)} />
							<span className={cn('h-2 w-1/3', SKELETON_BAR)} />
						</span>
					</li>
				))}
			</ul>
		</RecentFrame>
	);
}

/** The daily report holds no time of day: a day's lines go by time spent, not by when they happened. */
export function TeamRecentWork({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [limit, setLimit] = useState(LINES_STEP);
	const { recentDays } = dashboard.live;
	const formats = useMemo(() => dayFormatsOf(locale), [locale]);
	const visibleDays = useMemo(() => visibleDaysOf(recentDays, limit), [limit, recentDays]);

	if (dashboard.isReportLoading) {
		return <TeamRecentWorkSkeleton />;
	}
	if (dashboard.isReportError) {
		return (
			<RecentFrame>
				<DashboardErrorNotice onRetry={dashboard.refetchReport} className="m-3" />
			</RecentFrame>
		);
	}
	if (recentDays.length === 0) {
		return (
			<RecentFrame>
				<BlockEmptyMessage title={t('dashboard.team.recent.EMPTY')} />
			</RecentFrame>
		);
	}

	const totalLines = lineCountOf(recentDays);
	const hasMore = totalLines > limit;
	const showMore = () => setLimit((current) => current + LINES_STEP);

	return (
		<RecentFrame>
			<div aria-busy={dashboard.isRefreshing} className="flex flex-col pb-2">
				{visibleDays.map(({ day, lines }) => (
					<section
						key={day.dateKey}
						className="flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_10rem]"
					>
						<h3 className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 text-xs text-foreground">
							<DayLabel dateKey={day.dateKey} formats={formats} />
							<span className="tabular-nums text-muted-foreground">
								{formatDurationShort(day.seconds)}
							</span>
						</h3>
						<ul>
							{lines.map((line) => (
								<RecentWorkLine key={line.key} line={line} />
							))}
						</ul>
					</section>
				))}
				{hasMore && (
					<div className="px-4 pt-1">
						<button
							type="button"
							onClick={showMore}
							className="-mx-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							{t('dashboard.team.recent.SHOW_MORE')}
						</button>
					</div>
				)}
			</div>
		</RecentFrame>
	);
}
