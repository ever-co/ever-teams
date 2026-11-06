'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import type { TodaySegment } from '@/core/lib/utils/dashboards/team';
import { DurationValue } from './team-duration-value';
import { memberToneOf } from './team-series-tone';

type Translate = ReturnType<typeof useTranslations>;

const NAMED_SEGMENTS = 3;

const BAR_TRACK = 'relative block h-3 w-full overflow-hidden rounded-full bg-foreground/[0.07]';

const FOOT_ROW = 'flex items-center justify-between gap-3 text-xs tabular-nums';

function fillWidthOf(trackedSeconds: number, plannedSeconds: number) {
	const share = percentOf(trackedSeconds, plannedSeconds);
	const width = Math.min(share, 100);
	return `${width}%`;
}

function PlanEnd({
	plannedSeconds,
	isPlanLoading,
	isPlanError,
	onRetry
}: Readonly<{ plannedSeconds: number; isPlanLoading: boolean; isPlanError: boolean; onRetry: () => void }>) {
	const t = useTranslations();
	if (isPlanLoading) {
		return <span aria-hidden="true" className={cn('h-2 w-20', SKELETON_BAR)} />;
	}
	if (isPlanError) {
		return (
			<span className="flex items-center gap-1.5 text-muted-foreground">
				{t('dashboard.team.today.PLAN_ERROR')}
				<button
					type="button"
					onClick={onRetry}
					className="rounded-sm font-medium text-primary-ink outline-none hover:underline focus-visible:underline"
				>
					{t('pages.unauthorized.TRY_AGAIN')}
				</button>
			</span>
		);
	}
	if (plannedSeconds <= 0) {
		return <span className="text-muted-foreground">{t('dashboard.team.today.NO_PLAN')}</span>;
	}
	const planned = formatHoursLabel(plannedSeconds);
	return <span className="text-muted-foreground">{t('dashboard.team.today.PLANNED', { value: planned })}</span>;
}

function PlanBar({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const { todaySeconds, plannedSeconds, isPlanLoading, isPlanError, refetchPlans } = dashboard.live;
	const hasPlan = plannedSeconds > 0;
	const showsFill = hasPlan && !isPlanLoading;
	const share = percentOf(todaySeconds, plannedSeconds);
	return (
		<div className="flex flex-col gap-1.5">
			<span aria-hidden="true" className={BAR_TRACK}>
				{showsFill && (
					<span
						className="absolute inset-y-0 left-0 rounded-full bg-primary"
						style={{ width: fillWidthOf(todaySeconds, plannedSeconds) }}
					/>
				)}
			</span>
			<div className={FOOT_ROW}>
				<span className="font-medium text-foreground">{showsFill && formatPercent(share)}</span>
				<PlanEnd
					plannedSeconds={plannedSeconds}
					isPlanLoading={isPlanLoading}
					isPlanError={isPlanError}
					onRetry={refetchPlans}
				/>
			</div>
		</div>
	);
}

function othersLabelOf(segments: ReadonlyArray<TodaySegment>, t: Translate) {
	const otherCount = segments.length - NAMED_SEGMENTS;
	if (otherCount <= 0) {
		return null;
	}
	return t('dashboard.team.today.OTHERS', { count: otherCount });
}

function MemberSplit({ segments }: Readonly<{ segments: ReadonlyArray<TodaySegment> }>) {
	const t = useTranslations();
	if (segments.length === 0) {
		return (
			<div className="flex flex-col gap-1.5">
				<span aria-hidden="true" className="block h-2 w-full rounded-full bg-foreground/[0.05]" />
				<p className="text-xs text-muted-foreground">{t('dashboard.team.today.NOBODY')}</p>
			</div>
		);
	}
	const namedSegments = segments.slice(0, NAMED_SEGMENTS);
	const othersLabel = othersLabelOf(segments, t);
	return (
		<div className="flex flex-col gap-2">
			<span aria-hidden="true" className="flex h-2 w-full gap-px overflow-hidden rounded-full">
				{segments.map((segment) => (
					<span
						key={segment.key}
						className="h-full"
						style={{ width: `${segment.share}%`, backgroundColor: memberToneOf(segment.key) }}
					/>
				))}
			</span>
			<ul aria-label={t('dashboard.team.today.BY_MEMBER')} className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
				{namedSegments.map((segment) => (
					<li key={segment.key} className="flex min-w-0 items-center gap-1.5">
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: memberToneOf(segment.key) }}
						/>
						<span className="max-w-32 truncate text-foreground">
							{segment.name || t('dashboard.team.UNNAMED_MEMBER')}
						</span>
						<span className="tabular-nums text-muted-foreground">
							{formatDurationShort(segment.seconds)}
						</span>
					</li>
				))}
				{othersLabel && <li className="text-muted-foreground">{othersLabel}</li>}
			</ul>
		</div>
	);
}

function TodayFrame({ meta, children }: Readonly<{ meta?: string; children: ReactNode }>) {
	const t = useTranslations();
	return (
		<DashboardSection title={t('common.TODAY')} meta={meta} ariaLabel={t('dashboard.team.today.LABEL')}>
			<div className="flex flex-col gap-5 p-4">{children}</div>
		</DashboardSection>
	);
}

export function TeamTodayPlanSkeleton() {
	return (
		<TodayFrame>
			<div aria-hidden="true" className="flex flex-col gap-5">
				<span className={cn('my-1.5 block h-6 w-28', SKELETON_BAR)} />
				<div className="flex flex-col gap-1.5">
					<span className="block h-3 w-full animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className={FOOT_ROW}>
						<span className={cn('h-2 w-8', SKELETON_BAR)} />
						<span className={cn('h-2 w-20', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<span className="block h-2 w-full animate-pulse rounded-full bg-foreground/[0.05]" />
					<span className={cn('h-2 w-40', SKELETON_BAR)} />
				</div>
			</div>
		</TodayFrame>
	);
}

/** Today's total is the sum of the Right now rows, so the two blocks always agree. */
export function TeamTodayPlan({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const locale = useLocale();
	const { todaySeconds, todaySegments, isTodayLoading } = dashboard.live;
	const todayText = useMemo(() => {
		const format = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' });
		return format.format(new Date());
	}, [locale]);

	if (isTodayLoading) {
		return <TeamTodayPlanSkeleton />;
	}

	return (
		<TodayFrame meta={todayText}>
			<span className="text-3xl font-semibold tabular-nums text-foreground">
				<DurationValue seconds={todaySeconds} />
			</span>
			<PlanBar dashboard={dashboard} />
			<MemberSplit segments={todaySegments} />
		</TodayFrame>
	);
}
