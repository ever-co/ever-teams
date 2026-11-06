'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Clock, Folder, TaskDone, Users } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import type { LiveMember, TaskGroupCounts } from '@/core/lib/utils/dashboards/team';
import { CardGlyph, TeamCard } from './team-card';
import { DurationValue } from './team-duration-value';
import { FIGURE_SPAN } from './team-grid';
import { FaceStack } from './team-live-parts';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const VALUE = 'text-[22px] leading-7 font-semibold tabular-nums text-foreground';

const UNIT = 'text-sm font-normal text-muted-foreground';

const LINE = 'flex min-h-5 min-w-0 items-center gap-2 text-xs text-muted-foreground';

const TRACK = 'relative flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]';

function ValueSkeleton() {
	return <span aria-hidden="true" className={cn('my-1.5 block h-4 w-20', SKELETON_BAR)} />;
}

function LineSkeleton() {
	return <span aria-hidden="true" className={cn('h-2 w-28', SKELETON_BAR)} />;
}

function FigureCard({
	title,
	icon,
	value,
	line,
	isLoading
}: Readonly<{ title: string; icon: ReactNode; value: ReactNode; line: ReactNode; isLoading: boolean }>) {
	let shownValue: ReactNode = <span className={VALUE}>{value}</span>;
	let shownLine: ReactNode = line;
	if (isLoading) {
		shownValue = <ValueSkeleton />;
		shownLine = <LineSkeleton />;
	}
	return (
		<TeamCard
			title={title}
			icon={<CardGlyph>{icon}</CardGlyph>}
			className={FIGURE_SPAN}
			bodyClassName="flex flex-col justify-between gap-2"
		>
			{shownValue}
			<div className={LINE}>{shownLine}</div>
		</TeamCard>
	);
}

function ProgressLine({ share, label }: Readonly<{ share: number; label: string }>) {
	const width = Math.min(share, 100);
	return (
		<>
			<span aria-hidden="true" className={TRACK}>
				<span className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
			</span>
			<span className="shrink-0 font-medium tabular-nums text-foreground">{label}</span>
		</>
	);
}

function TrackedTodayLine({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { todaySeconds, plannedSeconds, isPlanLoading, isPlanError } = dashboard.live;
	if (isPlanLoading) {
		return <LineSkeleton />;
	}
	if (isPlanError) {
		return <span className="truncate">{t('dashboard.team.today.PLAN_ERROR')}</span>;
	}
	if (plannedSeconds <= 0) {
		return <span className="truncate">{t('dashboard.team.today.NO_PLAN')}</span>;
	}
	const share = percentOf(todaySeconds, plannedSeconds);
	return <ProgressLine share={share} label={formatPercent(share)} />;
}

function onTheTimerOf(members: ReadonlyArray<LiveMember>) {
	return members.filter((member) => {
		const isWorking = member.state === 'working';
		const isPaused = member.state === 'paused';
		return isWorking || isPaused;
	});
}

function WorkingNowLine({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { counts, liveMembers } = dashboard.live;
	const onTheTimer = onTheTimerOf(liveMembers);
	let context = t('dashboard.team.figures.NOBODY_TRACKING');
	if (counts.paused > 0) {
		context = t('dashboard.team.live.PAUSED', { count: counts.paused });
	}
	const hasOnlyWorking = counts.working > 0 && counts.paused === 0;
	if (hasOnlyWorking) {
		context = t('dashboard.team.live.WORKING', { count: counts.working });
	}
	return (
		<>
			<span className="min-w-0 flex-1 truncate">{context}</span>
			{onTheTimer.length > 0 && <FaceStack members={onTheTimer} />}
		</>
	);
}

function periodContextOf(dashboard: TeamDashboardState, t: Translate) {
	const { totals, scopeMemberCount } = dashboard;
	const days = t('dashboard.team.figures.OVER_DAYS', { days: totals.dayCount });
	const count = totals.memberCount;
	const hasScope = scopeMemberCount !== null;
	const isWithinScope = hasScope && count <= (scopeMemberCount ?? 0);
	let members = t('dashboard.team.META_MEMBERS', { count });
	if (isWithinScope) {
		members = t('dashboard.team.figures.MEMBERS_OF', { count, total: scopeMemberCount ?? 0 });
	}
	return `${days} · ${members}`;
}

const GROUP_TONES = {
	inProgress: 'bg-info',
	inReview: 'bg-warning',
	done: 'bg-success'
} as const;

const GROUP_ORDER = ['inProgress', 'inReview', 'done'] as const;

function TaskGroupsLine({ groups }: Readonly<{ groups: TaskGroupCounts }>) {
	const t = useTranslations();
	const total = groups.open + groups.done;
	const summary = t('dashboard.team.tasks.GROUPS_SUMMARY', {
		inProgress: groups.inProgress,
		inReview: groups.inReview,
		done: groups.done
	});
	return (
		<>
			<span className="sr-only">{summary}</span>
			<span aria-hidden="true" title={summary} className={cn(TRACK, 'gap-px')}>
				{GROUP_ORDER.map((group) => {
					const share = percentOf(groups[group], total);
					return (
						<span key={group} className={cn('h-full', GROUP_TONES[group])} style={{ width: `${share}%` }} />
					);
				})}
			</span>
			<span aria-hidden="true" className="shrink-0 tabular-nums">
				{t('dashboard.team.tasks.IN_PROGRESS_COUNT', { count: groups.inProgress })}
			</span>
		</>
	);
}

function WorkingNowValue({ working, total }: Readonly<{ working: number; total: number }>) {
	const t = useTranslations();
	return (
		<>
			{working} <span className={UNIT}>{t('dashboard.team.figures.OF_TOTAL', { total })}</span>
		</>
	);
}

function periodValueOf(dashboard: TeamDashboardState): ReactNode {
	if (!dashboard.hasReport) {
		return MISSING_FIGURE;
	}
	return <DurationValue seconds={dashboard.totals.seconds} />;
}

function openTasksValueOf(dashboard: TeamDashboardState): ReactNode {
	if (dashboard.live.isTasksError) {
		return MISSING_FIGURE;
	}
	return dashboard.live.taskGroups.open;
}

export function TeamFigures({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { live } = dashboard;
	return (
		<>
			<FigureCard
				title={t('dashboard.team.figures.TRACKED_TODAY')}
				icon={<Clock />}
				value={<DurationValue seconds={live.todaySeconds} />}
				line={<TrackedTodayLine dashboard={dashboard} />}
				isLoading={live.isTodayLoading}
			/>
			<FigureCard
				title={t('dashboard.team.figures.WORKING_NOW')}
				icon={<Users />}
				value={<WorkingNowValue working={live.counts.working} total={live.counts.total} />}
				line={<WorkingNowLine dashboard={dashboard} />}
				isLoading={live.isMembersLoading}
			/>
			<FigureCard
				title={t('dashboard.team.figures.THIS_PERIOD')}
				icon={<Folder />}
				value={periodValueOf(dashboard)}
				line={<span className="truncate">{periodContextOf(dashboard, t)}</span>}
				isLoading={dashboard.isReportLoading}
			/>
			<FigureCard
				title={t('dashboard.team.figures.TEAM_TASKS')}
				icon={<TaskDone />}
				value={openTasksValueOf(dashboard)}
				line={<TaskGroupsLine groups={live.taskGroups} />}
				isLoading={live.isTasksLoading}
			/>
		</>
	);
}

export function TeamFiguresSkeleton() {
	const t = useTranslations();
	const titles = [
		t('dashboard.team.figures.TRACKED_TODAY'),
		t('dashboard.team.figures.WORKING_NOW'),
		t('dashboard.team.figures.THIS_PERIOD'),
		t('dashboard.team.figures.TEAM_TASKS')
	];
	const icons = [<Clock key="clock" />, <Users key="users" />, <Folder key="folder" />, <TaskDone key="tasks" />];
	return (
		<>
			{titles.map((title, index) => (
				<FigureCard key={title} title={title} icon={icons[index]} value={null} line={null} isLoading />
			))}
		</>
	);
}
