'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_SURFACE, SECTION_META, SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { periodLengthInDays, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import type { TeamTableView } from '@/core/lib/utils/dashboards/team';
import { TeamDayCard } from './team-day-card';
import { TeamMemberCard, TeamMemberCardSkeleton } from './team-member-card';
import { TeamRosterSort } from './team-roster-sort';
import { seriesTonesOf } from './team-series-tone';
import { type SlotFormats, slotFormatsOf } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

/** `items-start`: a card that opens its details does not stretch the others of its row. */
const ROSTER_GRID = 'grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3';

/**
 * Cards off screen skip layout and paint. Containment clips paint to the item, so the item gives back the room of
 * the card's hairline and shadow with a padding its negative margin cancels.
 */
const ROSTER_ITEM = '-m-1 p-1 [content-visibility:auto] [contain-intrinsic-size:auto_17rem]';

const SKELETON_CARDS = 6;

function rosterTitleOf(view: TeamTableView, t: Translate) {
	if (view === 'member') {
		return t('dashboard.team.table.TITLE_MEMBERS');
	}
	return t('dashboard.team.table.TITLE_DAYS');
}

function shortDateOf(date: Date, formats: SlotFormats) {
	const currentYear = new Date().getFullYear();
	const isCurrentYear = date.getFullYear() === currentYear;
	if (isCurrentYear) {
		return formats.monthDay.format(date);
	}
	return formats.monthDayYear.format(date);
}

function RosterHeader({
	title,
	meta,
	actions
}: Readonly<{ title: string; meta?: string | null; actions?: ReactNode }>) {
	return (
		<header className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1">
			<div className="flex min-w-0 items-baseline gap-2">
				<h2 className={SECTION_TITLE}>{title}</h2>
				{meta && <span className={SECTION_META}>{meta}</span>}
			</div>
			{actions}
		</header>
	);
}

function RosterEmpty({ dashboard, formats }: Readonly<{ dashboard: TeamDashboardState; formats: SlotFormats }>) {
	const t = useTranslations();
	const { period, hasFilters } = dashboard;
	if (hasFilters) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.team.table.EMPTY_FILTERED_TITLE')}
				message={t('dashboard.team.table.EMPTY_FILTERED_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={dashboard.clearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	const from = shortDateOf(period.from, formats);
	const to = shortDateOf(period.to, formats);
	const isOneDay = from === to;
	let title = t('dashboard.team.table.EMPTY_RANGE', { from, to });
	if (isOneDay) {
		title = t('dashboard.team.table.EMPTY_DAY', { day: from });
	}
	const showPreviousPeriod = () => {
		const previousPeriod = shiftPeriod(period, -1);
		dashboard.setPeriod(previousPeriod);
	};
	return (
		<BlockEmptyMessage
			title={title}
			message={t('dashboard.team.table.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={showPreviousPeriod}>
					{t('dashboard.team.table.PREVIOUS_PERIOD')}
				</Button>
			}
		/>
	);
}

function RosterCardsSkeleton() {
	return (
		<ul aria-hidden="true" className={ROSTER_GRID}>
			{Array.from({ length: SKELETON_CARDS }).map((_, index) => (
				<li key={index}>
					<TeamMemberCardSkeleton />
				</li>
			))}
		</ul>
	);
}

export function TeamRosterSkeleton({ view = 'member' }: Readonly<{ view?: TeamTableView }>) {
	const t = useTranslations();
	const title = rosterTitleOf(view, t);
	return (
		<section aria-label={title} aria-busy="true" className="flex flex-col gap-2">
			<RosterHeader title={title} actions={<span className={cn('h-2.5 w-24', SKELETON_BAR)} />} />
			<RosterCardsSkeleton />
		</section>
	);
}

export function TeamRoster({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(() => slotFormatsOf(locale), [locale]);
	const tones = useMemo(() => seriesTonesOf(dashboard.series), [dashboard.series]);
	const { view, rosterMembers, rosterDays, totals, granularity, chartPeriod } = dashboard;
	const isMemberView = view === 'member';
	const hasRows = dashboard.rows.length > 0;
	const periodDays = periodLengthInDays(chartPeriod);
	const title = rosterTitleOf(view, t);

	if (dashboard.isReportLoading) {
		return <TeamRosterSkeleton view={view} />;
	}

	let meta: string | null = null;
	if (hasRows) {
		meta = t('dashboard.team.table.DAY_COUNT', { count: totals.dayCount });
	}
	if (hasRows && isMemberView) {
		meta = t('dashboard.team.table.MEMBER_COUNT', { count: totals.memberCount });
	}

	let sortMenu: ReactNode = null;
	if (hasRows) {
		sortMenu = <TeamRosterSort view={view} sort={dashboard.sort} onSort={dashboard.toggleSort} />;
	}

	let body: ReactNode = null;
	if (dashboard.isReportError) {
		body = (
			<div className={DASHBOARD_SURFACE}>
				<DashboardErrorNotice onRetry={dashboard.refetchReport} className="m-3" />
			</div>
		);
	} else if (!hasRows) {
		body = (
			<div className={DASHBOARD_SURFACE}>
				<RosterEmpty dashboard={dashboard} formats={formats} />
			</div>
		);
	} else if (isMemberView) {
		body = (
			<ul className={ROSTER_GRID}>
				{rosterMembers.map((member) => (
					<li key={member.summary.key} className={ROSTER_ITEM}>
						<TeamMemberCard
							member={member}
							canOpenTimesheet={dashboard.canOpenTimesheets}
							granularity={granularity}
							formats={formats}
							periodDays={periodDays}
						/>
					</li>
				))}
			</ul>
		);
	} else {
		body = (
			<ul className={ROSTER_GRID}>
				{rosterDays.map((day) => (
					<li key={day.summary.key} className={ROSTER_ITEM}>
						<TeamDayCard day={day} tones={tones} formats={formats} />
					</li>
				))}
			</ul>
		);
	}

	return (
		<section aria-label={title} aria-busy={dashboard.isRefreshing} className="flex flex-col gap-2">
			<RosterHeader title={title} meta={meta} actions={sortMenu} />
			{body}
		</section>
	);
}
