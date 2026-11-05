'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { InformationCircle } from '@/core/components/icons';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { usePlanGroupsOpen } from '@/core/hooks/dashboards/actual-expected/use-plan-groups-open';
import { cn } from '@/core/lib/helpers';
import { formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import {
	wholePercentOf,
	type MemberDay,
	type PlanGroup,
	type PlanGrouping,
	type PlanMember,
	type PlanTotals,
	type VarianceDay
} from '@/core/lib/utils/dashboards/actual-expected';
import {
	BULLET_GRID,
	BULLET_ROW_HEIGHT,
	DOT_LINE_HEIGHT,
	END_CELL,
	FIGURE_CELL,
	LEAD_CELL,
	LINE_LEAD,
	MEMBER_META_INDENT,
	METER_CELL
} from './bullet-grid';
import { BulletMeter, DayDotMeter } from './plan-meters';
import {
	DayLabel,
	DifferenceValue,
	figureOfDay,
	figureOfTotals,
	MemberFace,
	ReachedValue,
	SOURCE_LABEL_KEYS,
	type PlanFigure
} from './plan-cells';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const META_TEXT = 'truncate text-xs tabular-nums';

const SECTION_TITLE_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.weeklyLimit.SECTION_MEMBERS',
	day: 'dashboard.weeklyLimit.SECTION_DAYS'
};

const FIRST_COLUMN_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'common.MEMBER',
	day: 'dashboard.weeklyLimit.COLUMN_DAY'
};

const GROUP_COUNT_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.weeklyLimit.MEMBERS_COUNT',
	day: 'dashboard.weeklyLimit.DAYS_COUNT'
};

const UNPLANNED_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.actualExpected.ROW_DAYS_WITHOUT_PLAN',
	day: 'dashboard.actualExpected.ROW_MEMBERS_WITHOUT_PLAN'
};

const NAME_INDENTS: Record<PlanGrouping, string> = {
	member: MEMBER_META_INDENT,
	day: LINE_LEAD
};

function percentTextOf(figure: PlanFigure) {
	const expected = figure.expected ?? 0;
	if (expected <= 0) {
		return MISSING_FIGURE;
	}
	const share = (figure.actual / expected) * 100;
	return `${wholePercentOf(share)}%`;
}

function percentToneOf(figure: PlanFigure) {
	const expected = figure.expected ?? 0;
	if (expected <= 0) {
		return 'text-muted-foreground';
	}
	return 'text-foreground';
}

function PercentValue({ figure }: Readonly<{ figure: PlanFigure }>) {
	return (
		<span className={cn('text-right text-[13px] tabular-nums', percentToneOf(figure))}>
			{percentTextOf(figure)}
		</span>
	);
}

function missingPlanKeyOf(totals: PlanTotals): DottedLanguageObjectStringPaths {
	if (totals.withoutTimeDays > 0) {
		return 'dashboard.actualExpected.PLAN_WITHOUT_TIME';
	}
	return 'dashboard.actualExpected.NO_PLAN';
}

/** Over and under are two figures, never netted. */
function RowMeta({ totals, grouping }: Readonly<{ totals: PlanTotals; grouping: PlanGrouping }>) {
	const t = useTranslations();
	const hasOver = totals.over > 0;
	const hasUnder = totals.under > 0;
	const hasUnplanned = totals.unplannedDays > 0;
	const hasGap = hasOver || hasUnder;
	const isQuiet = !hasGap && !hasUnplanned;
	const showsOnPlan = isQuiet && totals.hasExpected;
	const showsMissingPlan = isQuiet && !totals.hasExpected;
	return (
		<span className={cn('flex min-w-0 flex-wrap items-center gap-x-2', NAME_INDENTS[grouping])}>
			{hasOver && (
				<span className={cn(META_TEXT, 'text-primary-ink')}>
					{t('dashboard.actualExpected.ROW_OVER', { duration: formatHoursLabel(totals.over) })}
				</span>
			)}
			{hasUnder && (
				<span className={cn(META_TEXT, 'text-warning-foreground')}>
					{t('dashboard.actualExpected.DIFFERENCE_UNDER', { duration: formatHoursLabel(totals.under) })}
				</span>
			)}
			{hasUnplanned && (
				<span className={cn(META_TEXT, 'text-muted-foreground')}>
					{t(UNPLANNED_KEYS[grouping], { count: totals.unplannedDays })}
				</span>
			)}
			{showsOnPlan && (
				<span className={cn(META_TEXT, 'text-muted-foreground')}>{t('dashboard.actualExpected.ON_PLAN')}</span>
			)}
			{showsMissingPlan && (
				<span className={cn(META_TEXT, 'text-muted-foreground')}>{t(missingPlanKeyOf(totals))}</span>
			)}
		</span>
	);
}

function GroupName({ group }: Readonly<{ group: PlanGroup }>) {
	const member = group.member;
	const day = group.day;
	if (member) {
		return <MemberCell name={member.name} imageUrl={member.imageUrl} />;
	}
	if (day) {
		return <DayLabel day={day} dayKey={group.key} />;
	}
	return null;
}

function GroupCells({ group, scale }: Readonly<{ group: PlanGroup; scale: number }>) {
	const figure = figureOfTotals(group.totals);
	return (
		<>
			<span role="cell" className={METER_CELL}>
				<BulletMeter expected={figure.expected} actual={figure.actual} scale={scale} />
			</span>
			<span role="cell" className={FIGURE_CELL}>
				<ReachedValue figure={figure} />
			</span>
			<span role="cell" className={END_CELL}>
				<PercentValue figure={figure} />
			</span>
		</>
	);
}

function SourceNote({ memberDay }: Readonly<{ memberDay: MemberDay }>) {
	const t = useTranslations();
	if (memberDay.source === 'estimates') {
		return (
			<span className={cn(META_TEXT, 'block text-muted-foreground')}>
				{t('dashboard.actualExpected.FROM_ESTIMATES')}
			</span>
		);
	}
	const taskEstimates = memberDay.taskEstimates;
	if (taskEstimates === null) {
		return null;
	}
	return (
		<span className={cn(META_TEXT, 'block text-muted-foreground')}>
			{t('dashboard.actualExpected.TASK_ESTIMATES_LINE', { duration: formatHoursLabel(taskEstimates) })}
		</span>
	);
}

function LineLead({ memberDay, grouping }: Readonly<{ memberDay: MemberDay; grouping: PlanGrouping }>) {
	const isByMember = grouping === 'member';
	if (isByMember) {
		return (
			<span className={cn('flex min-w-0 flex-col', NAME_INDENTS[grouping])}>
				<DayLabel day={memberDay.day} dayKey={memberDay.dayKey} />
				<SourceNote memberDay={memberDay} />
			</span>
		);
	}
	return (
		<span className={cn('flex min-w-0 flex-col', NAME_INDENTS[grouping])}>
			<MemberCell name={memberDay.name} imageUrl={memberDay.imageUrl} />
			<SourceNote memberDay={memberDay} />
		</span>
	);
}

function LineMeter({ memberDay }: Readonly<{ memberDay: MemberDay }>) {
	const t = useTranslations();
	const expected = memberDay.expected;
	if (expected === null) {
		return <span className="truncate text-xs text-muted-foreground">{t(SOURCE_LABEL_KEYS[memberDay.source])}</span>;
	}
	return <DayDotMeter expected={expected} actual={memberDay.actual} />;
}

const DotLine = memo(function DotLine({
	memberDay,
	grouping
}: Readonly<{ memberDay: MemberDay; grouping: PlanGrouping }>) {
	const figure = figureOfDay(memberDay);
	return (
		<div role="row" className={cn(BULLET_GRID, DOT_LINE_HEIGHT)}>
			<span role="cell" className={LEAD_CELL}>
				<LineLead memberDay={memberDay} grouping={grouping} />
			</span>
			<span role="cell" className={METER_CELL}>
				<LineMeter memberDay={memberDay} />
			</span>
			<span role="cell" className={FIGURE_CELL}>
				<ReachedValue figure={figure} />
			</span>
			<span role="cell" className={END_CELL}>
				<DifferenceValue figure={figure} />
			</span>
		</div>
	);
});

const BulletGroup = memo(function BulletGroup({
	group,
	grouping,
	scale,
	isOpen,
	onToggle
}: Readonly<{
	group: PlanGroup;
	grouping: PlanGrouping;
	scale: number;
	isOpen: boolean;
	onToggle: (key: string, wasOpen: boolean) => void;
}>) {
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const hasRows = group.rows.length > 0;

	if (!hasRows) {
		return null;
	}

	const header = (
		<>
			<span role="cell" className={cn(LEAD_CELL, 'flex flex-col gap-0.5')}>
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0 self-start">
					<GroupName group={group} />
				</GroupToggle>
				<RowMeta totals={group.totals} grouping={grouping} />
			</span>
			<GroupCells group={group} scale={scale} />
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={cn(BULLET_GRID, BULLET_ROW_HEIGHT)}>
			<div className="hairline-divide-y divide-border">
				{group.rows.map((memberDay) => (
					<DotLine key={memberDay.key} memberDay={memberDay} grouping={grouping} />
				))}
			</div>
		</ReportGroup>
	);
});

function ColumnHint({ label, hint }: Readonly<{ label: string; hint: string }>) {
	return (
		<Tooltip>
			<TooltipTrigger
				delay={400}
				render={
					<button
						type="button"
						className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
				}
			>
				<span>{label}</span>
				<InformationCircle aria-hidden="true" className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent className="max-w-72">{hint}</TooltipContent>
		</Tooltip>
	);
}

function BulletHeader({ grouping }: Readonly<{ grouping: PlanGrouping }>) {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={BULLET_GRID}>
			<span role="columnheader" className={cn(LEAD_CELL, LINE_LEAD)}>
				{t(FIRST_COLUMN_KEYS[grouping])}
			</span>
			<span role="columnheader" className={cn(METER_CELL, 'max-md:hidden')}>
				<ColumnHint
					label={t('dashboard.actualExpected.BULLET_COLUMN')}
					hint={t('dashboard.actualExpected.BULLET_COLUMN_HINT')}
				/>
			</span>
			<span role="columnheader" className={cn(FIGURE_CELL, 'text-right')}>
				{t('dashboard.actualExpected.COLUMN_TRACKED_OF_PLANNED')}
			</span>
			<span role="columnheader" className={cn(END_CELL, 'text-right max-md:hidden')}>
				{t('dashboard.actualExpected.COLUMN_REACHED')}
			</span>
		</ReportHeaderRow>
	);
}

function BulletTotals({ totals, countLabel }: Readonly<{ totals: PlanTotals; countLabel: string }>) {
	const t = useTranslations();
	const figure = figureOfTotals(totals);
	return (
		<ReportTotalsRow gridClassName={BULLET_GRID}>
			<span role="cell" className={cn(LEAD_CELL, LINE_LEAD, 'flex items-baseline gap-2')}>
				<span>{t('common.TOTAL')}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">{countLabel}</span>
			</span>
			<span role="cell" className={cn(METER_CELL, 'max-md:hidden')} />
			<span role="cell" className={FIGURE_CELL}>
				<ReachedValue figure={figure} />
			</span>
			<span role="cell" className={END_CELL}>
				<PercentValue figure={figure} />
			</span>
		</ReportTotalsRow>
	);
}

/** Members or days with neither a plan nor tracked time close the list as one line, so they never bury the others. */
function IdleFold({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	const [isOpen, setIsOpen] = useState(false);
	const toggle = useCallback(() => setIsOpen((current) => !current), []);
	return (
		<div role="rowgroup">
			<div role="row" className="flex min-h-11 items-center px-4 py-2">
				<span role="cell" className="min-w-0">
					<GroupToggle isOpen={isOpen} onToggle={toggle} className="font-normal text-muted-foreground">
						<span className="truncate">{label}</span>
					</GroupToggle>
				</span>
			</div>
			<AnimatedHeight>
				{isOpen && (
					<div role="row" className="flex pr-4 pb-3 pl-10">
						<span role="cell" className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
							{children}
						</span>
					</div>
				)}
			</AnimatedHeight>
		</div>
	);
}

function IdleMembersFold({ members }: Readonly<{ members: ReadonlyArray<PlanMember> }>) {
	const t = useTranslations();
	const label = t('dashboard.actualExpected.IDLE_MEMBERS', { count: members.length });
	return (
		<IdleFold label={label}>
			{members.map((member) => (
				<span
					key={member.employeeId}
					className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
				>
					<MemberFace name={member.name} imageUrl={member.imageUrl} />
					<span className="truncate">{member.name}</span>
				</span>
			))}
		</IdleFold>
	);
}

function IdleDaysFold({ days }: Readonly<{ days: ReadonlyArray<VarianceDay> }>) {
	const t = useTranslations();
	const label = t('dashboard.actualExpected.IDLE_DAYS', { count: days.length });
	return (
		<IdleFold label={label}>
			{days.map((day) => (
				<DayLabel
					key={day.dayKey}
					day={day.day}
					dayKey={day.dayKey}
					className="text-xs text-muted-foreground"
				/>
			))}
		</IdleFold>
	);
}

function IdleRows({
	grouping,
	idleMembers,
	idleDays
}: Readonly<{
	grouping: PlanGrouping;
	idleMembers: ReadonlyArray<PlanMember>;
	idleDays: ReadonlyArray<VarianceDay>;
}>) {
	const isByMember = grouping === 'member';
	const hasIdleMembers = idleMembers.length > 0;
	const hasIdleDays = idleDays.length > 0;
	if (isByMember) {
		if (!hasIdleMembers) {
			return null;
		}
		return <IdleMembersFold members={idleMembers} />;
	}
	if (!hasIdleDays) {
		return null;
	}
	return <IdleDaysFold days={idleDays} />;
}

/** The totals count the whole team by member, as before; by day they count the days that hold rows. */
function groupCountOf(grouping: PlanGrouping, activeCount: number, idleMemberCount: number) {
	if (grouping === 'member') {
		return activeCount + idleMemberCount;
	}
	return activeCount;
}

function toggleAllLabelOf(areAllOpen: boolean, t: Translate) {
	if (areAllOpen) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

const SKELETON_ROWS = [
	{ name: 72, track: 82 },
	{ name: 58, track: 64 },
	{ name: 66, track: 96 },
	{ name: 50, track: 48 },
	{ name: 62, track: 74 },
	{ name: 44, track: 56 }
];

function BulletRowsSkeleton() {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_ROWS.map((row) => (
				<div key={`${row.name}-${row.track}`} className={cn(BULLET_GRID, 'min-h-14')}>
					<span className={cn(LEAD_CELL, LINE_LEAD, 'flex items-center gap-2.5')}>
						<span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${row.name}%` }} />
					</span>
					<span className={METER_CELL}>
						<span
							className="block h-2.5 animate-pulse rounded-[3px] bg-foreground/[0.05]"
							style={{ width: `${row.track}%` }}
						/>
					</span>
					<span className={FIGURE_CELL}>
						<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
					</span>
					<span className={END_CELL}>
						<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					</span>
				</div>
			))}
		</div>
	);
}

export function PlanBulletRowsSkeleton({ grouping = 'member' }: Readonly<{ grouping?: PlanGrouping }>) {
	const t = useTranslations();
	const title = t(SECTION_TITLE_KEYS[grouping]);
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<BulletHeader grouping={grouping} />
				<BulletRowsSkeleton />
			</div>
		</DashboardSection>
	);
}

export interface PlanBulletRowsProps {
	/** Only the groups that hold a plan or tracked time. */
	groups: ReadonlyArray<PlanGroup>;
	idleMembers: ReadonlyArray<PlanMember>;
	idleDays: ReadonlyArray<VarianceDay>;
	grouping: PlanGrouping;
	totals: PlanTotals | null;
	scale: number;
	hasRows: boolean;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function PlanBulletRows({
	groups,
	idleMembers,
	idleDays,
	grouping,
	totals,
	scale,
	hasRows,
	isLoading,
	isUpdating,
	empty
}: Readonly<PlanBulletRowsProps>) {
	const t = useTranslations();
	const { isOpenAt, toggle, toggleAll, areAllOpen, canToggleAll } = usePlanGroupsOpen(groups, grouping);

	if (isLoading) {
		return <PlanBulletRowsSkeleton grouping={grouping} />;
	}

	const title = t(SECTION_TITLE_KEYS[grouping]);
	const groupCount = groupCountOf(grouping, groups.length, idleMembers.length);
	const groupCountLabel = t(GROUP_COUNT_KEYS[grouping], { count: groupCount });
	const showsEmpty = !hasRows;
	const showsTotals = hasRows && totals !== null;
	const showsToggleAll = canToggleAll && hasRows;
	const actions = showsToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabelOf(areAllOpen, t)}
		</Button>
	);
	const meta = hasRows && t('dashboard.actualExpected.DOT_LEGEND');

	return (
		<DashboardSection title={title} meta={meta} actions={actions} ariaLabel={title}>
			<div role="table" aria-busy={isUpdating}>
				<BulletHeader grouping={grouping} />
				{showsEmpty && empty}
				{hasRows && (
					<div className="hairline-divide-y divide-border">
						{groups.map((group, index) => (
							<BulletGroup
								key={group.key}
								group={group}
								grouping={grouping}
								scale={scale}
								isOpen={isOpenAt(group.key, index)}
								onToggle={toggle}
							/>
						))}
						<IdleRows grouping={grouping} idleMembers={idleMembers} idleDays={idleDays} />
					</div>
				)}
				{showsTotals && <BulletTotals totals={totals} countLabel={groupCountLabel} />}
			</div>
		</DashboardSection>
	);
}
