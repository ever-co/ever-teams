'use client';

import { memo, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { RecentLine } from '@/core/lib/utils/dashboards/team';
import { CardFooterButton, TALL_ROW, TeamCard } from './team-card';
import { NARROW_SPAN } from './team-grid';
import { memberNameOf } from './team-live-parts';
import { MemberFace } from './team-marks';
import { DayLabel, dayFormatsOf, lineCountOf, visibleDaysOf } from './team-recent-work';

const CARD_CLASS = cn(NARROW_SPAN, TALL_ROW);

const LINES_STEP = 8;

const SKELETON_LINES = 6;

function taskTextOf(line: RecentLine) {
	if (!line.taskNumberLabel) {
		return line.taskTitle;
	}
	return `${line.taskNumberLabel} ${line.taskTitle}`;
}

function LineTask({ line }: Readonly<{ line: RecentLine }>) {
	const t = useTranslations();
	if (!line.taskTitle) {
		return <span className="truncate text-muted-foreground">{t('dashboard.team.recent.WITHOUT_TASK')}</span>;
	}
	const text = taskTextOf(line);
	if (!line.taskId) {
		return (
			<span className="truncate text-muted-foreground" title={text}>
				{text}
			</span>
		);
	}
	return (
		<TaskDrawerLink
			taskId={line.taskId}
			prefetch={false}
			title={text}
			className="truncate rounded-sm text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:underline"
		>
			{text}
		</TaskDrawerLink>
	);
}

const RecentCardLine = memo(function RecentCardLine({ line }: Readonly<{ line: RecentLine }>) {
	const t = useTranslations();
	const name = memberNameOf(line.name, t);
	return (
		<li className="flex min-w-0 items-start gap-2.5 py-2">
			<MemberFace name={name} imageUrl={line.imageUrl} className="mt-0.5 size-5 text-[9px]" />
			<span className="flex min-w-0 flex-1 flex-col text-xs">
				<span className="flex min-w-0 items-baseline gap-1.5 text-[13px]">
					<span className="truncate font-medium text-foreground">{name}</span>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className="shrink-0 tabular-nums text-foreground">{formatDurationShort(line.seconds)}</span>
				</span>
				<LineTask line={line} />
			</span>
		</li>
	);
});

export function TeamRecentCardSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.recent.TITLE')} className={CARD_CLASS}>
			<ul aria-hidden="true" className="flex flex-col">
				{Array.from({ length: SKELETON_LINES }).map((_, index) => (
					<li key={index} className="flex items-start gap-2.5 py-2">
						<span className="size-5 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="flex flex-1 flex-col gap-1.5 pt-0.5">
							<span className={cn('h-2.5 w-2/3', SKELETON_BAR)} />
							<span className={cn('h-2 w-11/12', SKELETON_BAR)} />
						</span>
					</li>
				))}
			</ul>
		</TeamCard>
	);
}

export function TeamRecentCard({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [limit, setLimit] = useState(LINES_STEP);
	const { recentDays } = dashboard.live;
	const formats = useMemo(() => dayFormatsOf(locale), [locale]);
	const visibleDays = useMemo(() => visibleDaysOf(recentDays, limit), [limit, recentDays]);

	if (dashboard.isReportLoading) {
		return <TeamRecentCardSkeleton />;
	}

	const title = t('dashboard.team.recent.TITLE');
	if (dashboard.isReportError) {
		return (
			<TeamCard title={title} className={CARD_CLASS}>
				<DashboardErrorNotice onRetry={dashboard.refetchReport} />
			</TeamCard>
		);
	}
	if (recentDays.length === 0) {
		return (
			<TeamCard title={title} className={CARD_CLASS}>
				<p className="py-6 text-center text-[13px] text-muted-foreground text-balance">
					{t('dashboard.team.recent.EMPTY')}
				</p>
			</TeamCard>
		);
	}

	const totalLines = lineCountOf(recentDays);
	const hasMore = totalLines > limit;
	const showMore = () => setLimit((current) => current + LINES_STEP);
	let footer = null;
	if (hasMore) {
		footer = <CardFooterButton onClick={showMore}>{t('dashboard.team.recent.SHOW_MORE')}</CardFooterButton>;
	}

	return (
		<TeamCard title={title} footer={footer} isBusy={dashboard.isRefreshing} scrolls className={CARD_CLASS}>
			<div className="flex flex-col gap-4">
				{visibleDays.map(({ day, lines }) => (
					<section key={day.dateKey} className="flex flex-col">
						<h3 className="flex items-center justify-between gap-3 text-xs text-foreground">
							<DayLabel dateKey={day.dateKey} formats={formats} />
							<span className="tabular-nums text-muted-foreground">
								{formatDurationShort(day.seconds)}
							</span>
						</h3>
						<ul className="flex flex-col">
							{lines.map((line) => (
								<RecentCardLine key={line.key} line={line} />
							))}
						</ul>
					</section>
				))}
			</div>
		</TeamCard>
	);
}
