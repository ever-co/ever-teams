'use client';

import { memo, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ChevronDown } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { LiveCounts, LiveMember } from '@/core/lib/utils/dashboards/team';
import {
	DOT_TONES,
	CHIP_TONES,
	doingTextOf,
	FaceStack,
	foldedTextOf,
	isQuietMember,
	MemberName,
	memberNameOf,
	STATE_LABEL_KEYS,
	timesheetHrefOf
} from './team-live-parts';
import { MemberFace } from './team-marks';

type Translate = ReturnType<typeof useTranslations>;

const SHOWN_MEMBERS = 8;

const SKELETON_ROWS = 6;

const ROW_GRID =
	'grid min-h-13 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]';

const LiveRow = memo(function LiveRow({
	member,
	canOpenTimesheet,
	dayFormat
}: Readonly<{ member: LiveMember; canOpenTimesheet: boolean; dayFormat: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const name = memberNameOf(member.name, t);
	const isQuiet = isQuietMember(member);
	const href = timesheetHrefOf(member, name, canOpenTimesheet);
	const stateLabel = t(STATE_LABEL_KEYS[member.state]);
	const doingText = doingTextOf(member, dayFormat, t);
	return (
		<li className={ROW_GRID}>
			<div className="flex min-w-0 items-center gap-3">
				<span className="relative shrink-0">
					<MemberFace name={name} imageUrl={member.imageUrl} className="size-8 text-[11px]" />
					<span
						aria-hidden="true"
						className={cn(
							'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card',
							DOT_TONES[member.state]
						)}
					/>
				</span>
				<div className="flex min-w-0 flex-col">
					<MemberName name={name} href={href} isQuiet={isQuiet} />
					<span className="truncate text-xs text-muted-foreground" title={doingText}>
						<span className="sr-only">{stateLabel}, </span>
						{doingText}
					</span>
				</div>
			</div>
			<span
				className={cn(
					'text-right text-[13px] tabular-nums',
					isQuiet && 'text-muted-foreground',
					!isQuiet && 'font-medium text-foreground'
				)}
			>
				{formatDurationShort(member.todaySeconds)}
			</span>
			<span
				aria-hidden="true"
				className={cn(
					'inline-flex h-5 items-center justify-self-end rounded-md px-1.5 text-[11px] font-medium max-sm:hidden',
					CHIP_TONES[member.state]
				)}
			>
				{stateLabel}
			</span>
		</li>
	);
});

/** The not started count is left to the closing fold line, so the same number never shows twice in the block. */
function stateLineOf(counts: LiveCounts, t: Translate) {
	const parts = [t('dashboard.team.live.WORKING_NOW', { working: counts.working, total: counts.total })];
	if (counts.paused > 0) {
		parts.push(t('dashboard.team.live.PAUSED', { count: counts.paused }));
	}
	return parts.join(' · ');
}

/** Members with nothing today fold into one line that opens in place: nobody leaves the board. */
function NotStartedFold({
	members,
	canOpenTimesheet,
	dayFormat,
	hasRowsAbove
}: Readonly<{
	members: ReadonlyArray<LiveMember>;
	canOpenTimesheet: boolean;
	dayFormat: Intl.DateTimeFormat;
	hasRowsAbove: boolean;
}>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	if (members.length === 0) {
		return null;
	}
	return (
		<div className={cn(hasRowsAbove && 'hairline-t border-dashed border-border')}>
			<button
				type="button"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((current) => !current)}
				className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04]"
			>
				<FaceStack members={members} />
				<span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
					{t('dashboard.team.live.NOT_STARTED', { count: members.length })}
				</span>
				<ChevronDown
					aria-hidden="true"
					className={cn(
						'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
						isOpen && 'rotate-180'
					)}
				/>
			</button>
			<AnimatedHeight>
				{isOpen && (
					<ul className="pb-2">
						{members.map((member) => {
							const name = memberNameOf(member.name, t);
							const href = timesheetHrefOf(member, name, canOpenTimesheet);
							return (
								<li
									key={member.employeeId}
									className="flex min-h-9 min-w-0 items-center gap-2.5 px-4 py-1"
								>
									<MemberFace name={name} imageUrl={member.imageUrl} className="size-5 text-[9px]" />
									<MemberName name={name} href={href} isQuiet />
									<span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
										{foldedTextOf(member, dayFormat, t)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</AnimatedHeight>
		</div>
	);
}

function moreLabelOf(showsAll: boolean, total: number, t: Translate) {
	if (showsAll) {
		return t('dashboard.team.roster.FEWER_MEMBERS');
	}
	return t('dashboard.team.live.SHOW_ALL', { count: total });
}

export function TeamRightNowSkeleton() {
	const t = useTranslations();
	return (
		<DashboardSection title={t('dashboard.team.live.TITLE')} ariaLabel={t('dashboard.team.live.TITLE')}>
			<ul aria-hidden="true" className="hairline-divide-y divide-border">
				{Array.from({ length: SKELETON_ROWS }).map((_, index) => (
					<li key={index} className={ROW_GRID}>
						<span className="flex items-center gap-3">
							<span className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
							<span className="flex flex-col gap-1.5">
								<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
								<span className={cn('h-2 w-40', SKELETON_BAR)} />
							</span>
						</span>
						<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
						<span className={cn('ml-auto h-4 w-16 max-sm:hidden', SKELETON_BAR)} />
					</li>
				))}
			</ul>
		</DashboardSection>
	);
}

export function TeamRightNow({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [showsAll, setShowsAll] = useState(false);
	const { liveMembers, boardRows, counts, isMembersLoading } = dashboard.live;
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);

	if (isMembersLoading) {
		return <TeamRightNowSkeleton />;
	}

	const title = t('dashboard.team.live.TITLE');
	if (liveMembers.length === 0) {
		return (
			<DashboardSection title={title} ariaLabel={title}>
				<BlockEmptyMessage title={t('dashboard.team.live.EMPTY')} />
			</DashboardSection>
		);
	}

	const activeMembers = boardRows.active;
	const hasActiveRows = activeMembers.length > 0;
	const hasHidden = activeMembers.length > SHOWN_MEMBERS;
	let shownMembers = activeMembers;
	if (!showsAll) {
		shownMembers = activeMembers.slice(0, SHOWN_MEMBERS);
	}

	return (
		<DashboardSection title={title} meta={stateLineOf(counts, t)} ariaLabel={title}>
			{hasActiveRows && (
				<ul className="hairline-divide-y divide-border">
					{shownMembers.map((member) => (
						<LiveRow
							key={member.employeeId}
							member={member}
							canOpenTimesheet={dashboard.canOpenTimesheets}
							dayFormat={dayFormat}
						/>
					))}
				</ul>
			)}
			{hasHidden && (
				<div className="hairline-t border-dashed border-border px-4 py-2">
					<button
						type="button"
						aria-expanded={showsAll}
						onClick={() => setShowsAll((current) => !current)}
						className="-mx-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{moreLabelOf(showsAll, activeMembers.length, t)}
					</button>
				</div>
			)}
			<NotStartedFold
				members={boardRows.notStarted}
				canOpenTimesheet={dashboard.canOpenTimesheets}
				dayFormat={dayFormat}
				hasRowsAbove={hasActiveRows}
			/>
		</DashboardSection>
	);
}
