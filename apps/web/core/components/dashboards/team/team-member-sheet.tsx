'use client';

import { type ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle, floatingSheetSurface } from '@/core/components/common/sheet';
import { ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { Button } from '@/core/components/duplicated-components/_button';
import { useMemberDayTimeline } from '@/core/hooks/dashboards/team/use-team-day-board';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatAmount } from '@/core/lib/utils/daily-report-figures';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { periodLengthInDays } from '@/core/lib/utils/dashboard-period';
import {
	type LiveMember,
	type LiveTodayTask,
	memberProjectSharesOf,
	type ProjectShareItem,
	type RosterMember
} from '@/core/lib/utils/dashboards/team';
import { MemberDayStrip, MemberDayStripSkeleton } from './team-day-timeline';
import { doingTextOf, memberNameOf, StateChip, StateDot, timesheetHrefOf } from './team-live-parts';
import { MemberFace, ProjectMark } from './team-marks';
import { MicroColumns } from './team-member-card';
import { memberToneOf } from './team-series-tone';
import { slotFormatsOf } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

const SHEET_SURFACE = cn(floatingSheetSurface, 'w-[min(26.25rem,calc(100vw-1rem))]');

const SECTION = 'flex flex-col gap-2 px-5 py-3';

const SECTION_HEADING = 'flex items-baseline justify-between gap-3 text-[13px] font-medium text-foreground';

const FACT_ROW = 'grid min-h-8 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-[13px]';

function roleOf(member: LiveMember, t: Translate) {
	if (member.profile.isManager) {
		return t('common.MANAGER');
	}
	return t('common.MEMBER');
}

function todayTaskTextOf(task: LiveTodayTask, t: Translate) {
	if (!task.title) {
		return t('dashboard.team.table.NO_TASK');
	}
	if (!task.numberLabel) {
		return task.title;
	}
	return `${task.numberLabel} ${task.title}`;
}

function projectNameOf(item: ProjectShareItem, t: Translate) {
	if (item.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return item.name || t('dashboard.team.projects.NONE');
}

function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className={FACT_ROW}>
			<span className="text-muted-foreground">{label}</span>
			<span className="min-w-0 truncate text-foreground">{children}</span>
		</div>
	);
}

function RateValue({ member }: Readonly<{ member: LiveMember }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { billRateValue, billRateCurrency } = member.profile;
	const hasRate = billRateValue !== null && billRateValue > 0;
	if (!hasRate || !billRateCurrency) {
		return <span className="text-warning-foreground">{t('dashboard.team.sheet.NO_RATE')}</span>;
	}
	const amount = formatAmount({ currency: billRateCurrency, amount: billRateValue }, locale);
	return (
		<span className="tabular-nums">
			{amount}
			<span className="text-muted-foreground">/h</span>
		</span>
	);
}

function TodaySection({ dashboard, member }: Readonly<{ dashboard: TeamDashboardState; member: LiveMember }>) {
	const t = useTranslations();
	const day = useMemberDayTimeline(dashboard, member);
	const tasks = member.profile.todayTasks;
	return (
		<section className={SECTION}>
			<h3 className={SECTION_HEADING}>
				<span>{t('common.TODAY')}</span>
				<span className="tabular-nums">{formatDurationShort(member.todaySeconds)}</span>
			</h3>
			{day.isLoading && <MemberDayStripSkeleton />}
			{!day.isLoading && <MemberDayStrip timeline={day.timeline} />}
			{tasks.length === 0 && (
				<p className="text-xs text-muted-foreground">{t('dashboard.team.sheet.NO_TODAY')}</p>
			)}
			<ul className="flex flex-col">
				{tasks.map((task) => (
					<li key={task.key} className="flex min-h-8 min-w-0 items-center justify-between gap-3 text-[13px]">
						<span className="truncate text-foreground">{todayTaskTextOf(task, t)}</span>
						<span className="shrink-0 tabular-nums text-muted-foreground">
							{formatDurationShort(task.seconds)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}

function PeriodSection({
	dashboard,
	member,
	roster
}: Readonly<{ dashboard: TeamDashboardState; member: LiveMember; roster: RosterMember | null }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(() => slotFormatsOf(locale), [locale]);
	const periodDays = periodLengthInDays(dashboard.chartPeriod);
	if (!roster) {
		return (
			<section className={SECTION}>
				<h3 className={SECTION_HEADING}>{t('dashboard.team.figures.THIS_PERIOD')}</h3>
				<p className="text-xs text-muted-foreground">{t('dashboard.team.live.NO_TIME_IN_PERIOD')}</p>
			</section>
		);
	}
	return (
		<section className={SECTION}>
			<h3 className={SECTION_HEADING}>
				<span>{t('dashboard.team.figures.THIS_PERIOD')}</span>
				<span className="tabular-nums">{formatDurationShort(roster.summary.seconds)}</span>
			</h3>
			<MicroColumns
				columns={roster.columns}
				peakKey={roster.peakColumnKey}
				granularity={dashboard.granularity}
				formats={formats}
				periodDays={periodDays}
				tone={memberToneOf(member.employeeId)}
			/>
		</section>
	);
}

function ProjectsSection({ dashboard, member }: Readonly<{ dashboard: TeamDashboardState; member: LiveMember }>) {
	const t = useTranslations();
	const shares = useMemo(
		() => memberProjectSharesOf(dashboard.rows, member.employeeId),
		[dashboard.rows, member.employeeId]
	);
	if (shares.length === 0) {
		return null;
	}
	return (
		<section className={SECTION}>
			<h3 className={SECTION_HEADING}>{t('dashboard.team.table.PROJECTS')}</h3>
			<ShareRows
				rows={shares}
				renderName={(item) => (
					<>
						<ProjectMark imageUrl={item.imageUrl} color={item.color} isNoProject={item.isNoProject} />
						<span className="truncate">{projectNameOf(item, t)}</span>
					</>
				)}
				formatValue={formatDurationShort}
				otherLabel={(count) => t('dashboard.team.projects.OTHER', { count })}
				className="-mx-4"
				density="narrow"
			/>
		</section>
	);
}

function SheetBody({
	dashboard,
	member,
	roster
}: Readonly<{ dashboard: TeamDashboardState; member: LiveMember; roster: RosterMember | null }>) {
	const t = useTranslations();
	const locale = useLocale();
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	const name = memberNameOf(member.name, t);
	const href = timesheetHrefOf(member, name, dashboard.canOpenTimesheets);
	const doingText = doingTextOf(member, dayFormat, t);
	return (
		<>
			<header className="flex items-center gap-3 px-5 pt-5 pb-4 pr-14">
				<span className="relative shrink-0">
					<MemberFace name={name} imageUrl={member.imageUrl} className="size-10 text-xs" />
					<StateDot state={member.state} className="size-3" />
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<SheetTitle className="truncate text-base">{name}</SheetTitle>
					<span className="truncate text-xs text-muted-foreground">{roleOf(member, t)}</span>
				</div>
				{href && (
					<Button asChild variant="outline" size="default">
						<Link href={href} prefetch={false}>
							{t('common.VIEW_TIMESHEET')}
						</Link>
					</Button>
				)}
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto pb-4">
				<section className={cn(SECTION, 'gap-0')}>
					{member.profile.email && <Fact label={t('common.EMAIL')}>{member.profile.email}</Fact>}
					<Fact label={t('dashboard.team.sheet.STATUS_NOW')}>
						<StateChip state={member.state} />
					</Fact>
					<Fact label={t('dashboard.team.sheet.CURRENT_TASK')}>
						<span title={doingText}>{doingText}</span>
					</Fact>
					<Fact label={t('common.RATE')}>
						<RateValue member={member} />
					</Fact>
				</section>
				<TodaySection dashboard={dashboard} member={member} />
				<PeriodSection dashboard={dashboard} member={member} roster={roster} />
				<ProjectsSection dashboard={dashboard} member={member} />
			</div>
		</>
	);
}

/**
 * The member opened from the table, in the app's floating side sheet. Escape and the close button close it; the
 * sheet gives the focus back to the row that opened it.
 */
export function TeamMemberSheet({
	dashboard,
	isOpen,
	member,
	roster,
	onClose
}: Readonly<{
	dashboard: TeamDashboardState;
	isOpen: boolean;
	/** Kept after closing so the sheet slides out with its content. */
	member: LiveMember | null;
	roster: RosterMember | null;
	onClose: () => void;
}>) {
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			onClose();
		}
	};
	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className={SHEET_SURFACE}>
				{member && <SheetBody dashboard={dashboard} member={member} roster={roster} />}
			</SheetContent>
		</Sheet>
	);
}
