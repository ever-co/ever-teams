'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { scrollBehavior } from '@/core/lib/utils/motion';
import type { LiveCounts, LiveMember } from '@/core/lib/utils/dashboards/team';
import { CardFooterButton, TALL_ROW, TeamCard } from './team-card';
import { NARROW_SPAN } from './team-grid';
import { doingTextOf, FaceStack, memberNameOf, StateDot } from './team-live-parts';
import { MemberFace } from './team-marks';

type Translate = ReturnType<typeof useTranslations>;

export const TEAM_MEMBERS_ANCHOR = 'team-members';

const CARD_CLASS = cn(NARROW_SPAN, TALL_ROW);

const ROW = 'flex min-h-12 min-w-0 items-center gap-3 py-2';

const SKELETON_ROWS = 5;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROWS }, (_, index) => `row-${index}`);

function stateMetaOf(counts: LiveCounts, t: Translate) {
	const parts: string[] = [];
	if (counts.working > 0) {
		parts.push(t('dashboard.team.live.WORKING', { count: counts.working }));
	}
	if (counts.paused > 0) {
		parts.push(t('dashboard.team.live.PAUSED', { count: counts.paused }));
	}
	return parts.join(' · ');
}

const TodayRow = memo(function TodayRow({
	member,
	dayFormat
}: Readonly<{ member: LiveMember; dayFormat: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const name = memberNameOf(member.name, t);
	const doingText = doingTextOf(member, dayFormat, t);
	return (
		<li className={ROW}>
			<span className="relative shrink-0">
				<MemberFace name={name} imageUrl={member.imageUrl} className="size-7 text-[10px]" />
				<StateDot state={member.state} />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
				<span className="truncate text-xs text-muted-foreground" title={doingText}>
					{doingText}
				</span>
			</span>
			<span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
				{formatDurationShort(member.todaySeconds)}
			</span>
		</li>
	);
});

function scrollToMembers() {
	const table = document.getElementById(TEAM_MEMBERS_ANCHOR);
	table?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
	table?.focus({ preventScroll: true });
}

export function TeamTodayCardSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.cards.TEAM_TODAY')} className={CARD_CLASS}>
			<ul aria-hidden="true" className="flex flex-col">
				{SKELETON_ROW_KEYS.map((slotKey) => (
					<li key={slotKey} className={ROW}>
						<span className="size-7 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="flex flex-1 flex-col gap-1.5">
							<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
							<span className={cn('h-2 w-36', SKELETON_BAR)} />
						</span>
						<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
					</li>
				))}
			</ul>
		</TeamCard>
	);
}

/** Today's time is the sum of these rows: the members without time today sit in the closing line at 0. */
export function TeamTodayCard({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { boardRows, counts, isMembersLoading, liveMembers } = dashboard.live;
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);

	if (isMembersLoading) {
		return <TeamTodayCardSkeleton />;
	}

	const title = t('dashboard.team.cards.TEAM_TODAY');
	const hasMembers = liveMembers.length > 0;
	const footer = (
		<CardFooterButton onClick={scrollToMembers} withArrow>
			{t('dashboard.team.cards.SEE_ALL_MEMBERS')}
		</CardFooterButton>
	);

	if (!hasMembers) {
		return (
			<TeamCard title={title} className={CARD_CLASS}>
				<p className="py-6 text-center text-[13px] text-muted-foreground">{t('dashboard.team.live.EMPTY')}</p>
			</TeamCard>
		);
	}

	const notStarted = boardRows.notStarted;
	return (
		<TeamCard title={title} meta={stateMetaOf(counts, t)} footer={footer} scrolls className={CARD_CLASS}>
			<ul className="flex flex-col">
				{boardRows.active.map((member) => (
					<TodayRow key={member.employeeId} member={member} dayFormat={dayFormat} />
				))}
				{notStarted.length > 0 && (
					<li className={ROW}>
						<FaceStack members={notStarted} />
						<span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
							{t('dashboard.team.live.NOT_STARTED', { count: notStarted.length })}
						</span>
					</li>
				)}
			</ul>
		</TeamCard>
	);
}
