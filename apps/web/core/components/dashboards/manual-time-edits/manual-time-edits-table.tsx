'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';
import { isSameYear } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Checkbox } from '@/core/components/common/checkbox';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Plus, Trash } from '@/core/components/icons';
import { canEditLog, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { Period } from '@/core/lib/utils/dashboard-period';
import type {
	EditsGroup,
	EditsGrouping,
	EditsMember,
	ManualTimeEntry
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { DayName, type EditRowHandlers, type EditsFormatters, ManualTimeEditRow } from './manual-time-edit-row';
import {
	EDITS_GRID,
	GROUP_NAME_SPAN,
	GROUP_TOTAL_SPAN,
	GROUP_TRAILING_SPAN,
	OPEN_GROUPS_BY_DEFAULT,
	TOTALS_LABEL_SPAN,
	WIDE_ONLY
} from './manual-time-edits-grid';

type Translate = ReturnType<typeof useTranslations>;

export interface EditsTableHandlers extends EditRowHandlers {
	selectEntries: (entryIds: ReadonlyArray<string>, shouldSelect: boolean) => void;
	removeSelected: (entries: ReadonlyArray<ManualTimeEntry>) => void;
}

function sectionTitleKeyOf(grouping: EditsGrouping) {
	if (grouping === 'member') {
		return 'dashboard.manualTimeEdits.SECTION_MEMBERS' as const;
	}
	return 'dashboard.manualTimeEdits.SECTION_DAYS' as const;
}

function leadColumnKeyOf(grouping: EditsGrouping) {
	if (grouping === 'member') {
		return 'dashboard.timesheets.COLUMNS.DATE' as const;
	}
	return 'common.MEMBER' as const;
}

function TableHeader({ grouping }: Readonly<{ grouping: EditsGrouping }>) {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={EDITS_GRID} className={WIDE_ONLY}>
			<span aria-hidden="true" />
			<span role="columnheader">{t(leadColumnKeyOf(grouping))}</span>
			<span role="columnheader">{t('dashboard.timesheets.COLUMNS.TASK')}</span>
			<span role="columnheader">{t('dashboard.manualTimeEdits.COLUMN_CHANGE')}</span>
			<span role="columnheader">{t('dashboard.timesheets.COLUMNS.TIME')}</span>
			<span role="columnheader" className="text-right">
				{t('dashboard.timesheets.COLUMNS.DURATION')}
			</span>
			<span role="columnheader">
				<span className="sr-only">{t('dashboard.timesheets.COLUMNS.BILLABLE')}</span>
			</span>
			<span role="columnheader">{t('dashboard.timesheets.COLUMNS.STATUS')}</span>
			<span aria-hidden="true" />
		</ReportHeaderRow>
	);
}

export interface GroupSelection {
	selectableIds: string[];
	selectedEntries: ManualTimeEntry[];
	isChecked: boolean;
	isPartial: boolean;
}

export function groupSelectionOf(
	group: EditsGroup,
	selectedIdSet: ReadonlySet<string>,
	permissions: TimesheetPermissions
): GroupSelection {
	const selectableIds: string[] = [];
	const selectedEntries: ManualTimeEntry[] = [];
	for (const entry of group.entries) {
		const canEdit = canEditLog(entry.log, permissions);
		if (!canEdit) {
			continue;
		}
		selectableIds.push(entry.key);
		const isSelected = selectedIdSet.has(entry.key);
		if (isSelected) {
			selectedEntries.push(entry);
		}
	}
	const hasSelectable = selectableIds.length > 0;
	const hasSelected = selectedEntries.length > 0;
	const isEverySelected = selectedEntries.length === selectableIds.length;
	const isChecked = hasSelectable && isEverySelected;
	const isPartial = hasSelected && !isChecked;
	return { selectableIds, selectedEntries, isChecked, isPartial };
}

function GroupName({ group, formatters }: Readonly<{ group: EditsGroup; formatters: EditsFormatters }>) {
	const member = group.member;
	const day = group.day;
	if (member) {
		return <MemberCell name={member.name} imageUrl={member.imageUrl} />;
	}
	if (day) {
		return <DayName day={day} formatters={formatters} className="font-normal" />;
	}
	return null;
}

function groupLabelOf(group: EditsGroup, formatters: EditsFormatters) {
	if (group.member) {
		return group.member.name;
	}
	if (group.day) {
		return formatters.dayDate(group.day);
	}
	return '';
}

const EditsGroupBlock = memo(function EditsGroupBlock({
	group,
	grouping,
	isOpen,
	onToggle,
	selectedIdSet,
	permissions,
	formatters,
	handlers
}: Readonly<{
	group: EditsGroup;
	grouping: EditsGrouping;
	isOpen: boolean;
	onToggle: (key: string, wasOpen: boolean) => void;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: EditsFormatters;
	handlers: EditsTableHandlers;
}>) {
	const t = useTranslations();
	const selection = groupSelectionOf(group, selectedIdSet, permissions);
	const selectedCount = selection.selectedEntries.length;
	const hasSelection = selectedCount > 0;
	const hasSelectable = selection.selectableIds.length > 0;
	const entryCount = group.entries.length;
	const groupLabel = groupLabelOf(group, formatters);
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const { selectableIds, selectedEntries } = selection;
	const { selectEntries, removeSelected } = handlers;

	const header = (
		<>
			<span role="cell" className="flex items-center">
				{hasSelectable && (
					<Checkbox
						checked={selection.isChecked}
						indeterminate={selection.isPartial}
						onCheckedChange={(checked) => selectEntries(selectableIds, checked)}
						aria-label={t('dashboard.manualTimeEdits.SELECT_GROUP', { group: groupLabel })}
					/>
				)}
			</span>
			<span role="rowheader" className={cn('flex min-w-0 items-center gap-2', GROUP_NAME_SPAN)}>
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
					<GroupName group={group} formatters={formatters} />
				</GroupToggle>
				{hasSelection && (
					<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
						<span className="tabular-nums">
							{t('dashboard.manualTimeEdits.SELECTED_COUNT', { count: selectedCount })}
						</span>
						<span aria-hidden="true">·</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => removeSelected(selectedEntries)}
							className="text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink"
						>
							<Trash />
							<span>{t('common.DELETE')}</span>
						</Button>
					</span>
				)}
			</span>
			<span
				role="cell"
				className={cn('flex min-w-0 items-baseline justify-end gap-1.5 tabular-nums', GROUP_TOTAL_SPAN)}
			>
				<span className="truncate text-xs text-muted-foreground max-sm:hidden">
					{t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: entryCount })}
				</span>
				<span aria-hidden="true" className="text-xs text-muted-foreground max-sm:hidden">
					·
				</span>
				<span className="text-[13px] font-semibold text-foreground">{formatDurationShort(group.seconds)}</span>
			</span>
			<span aria-hidden="true" className={GROUP_TRAILING_SPAN} />
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={cn(EDITS_GRID, 'bg-foreground/[0.02]')}>
			<div className="hairline-divide-y divide-border">
				{group.entries.map((entry) => (
					<ManualTimeEditRow
						key={entry.key}
						entry={entry}
						grouping={grouping}
						isSelected={selectedIdSet.has(entry.key)}
						canEdit={canEditLog(entry.log, permissions)}
						formatters={formatters}
						handlers={handlers}
					/>
				))}
			</div>
		</ReportGroup>
	);
});

function TotalsRow({ entryCount, seconds }: Readonly<{ entryCount: number; seconds: number }>) {
	const t = useTranslations();
	return (
		<ReportTotalsRow gridClassName={EDITS_GRID}>
			<span role="cell" className={cn('flex min-w-0 items-baseline gap-2', TOTALS_LABEL_SPAN)}>
				<span>{t('common.TOTAL')}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
					{t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: entryCount })}
				</span>
			</span>
			<span role="cell" className="text-right tabular-nums">
				{formatDurationShort(seconds)}
			</span>
			<span aria-hidden="true" className={GROUP_TRAILING_SPAN} />
		</ReportTotalsRow>
	);
}

function isGroupOpen(overrides: Readonly<Record<string, boolean>>, key: string, index: number) {
	const override = overrides[key];
	if (typeof override === 'boolean') {
		return override;
	}
	return index < OPEN_GROUPS_BY_DEFAULT;
}

function allGroupsOpen(groups: ReadonlyArray<EditsGroup>, overrides: Readonly<Record<string, boolean>>) {
	return groups.every((group, index) => isGroupOpen(overrides, group.key, index));
}

function useGroupOpenState() {
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});

	const toggle = useCallback((key: string, wasOpen: boolean) => {
		setOverrides((current) => ({ ...current, [key]: !wasOpen }));
	}, []);

	const setAll = useCallback((keys: ReadonlyArray<string>, isOpen: boolean) => {
		const next: Record<string, boolean> = {};
		for (const key of keys) {
			next[key] = isOpen;
		}
		setOverrides(next);
	}, []);

	return { overrides, toggle, setAll };
}

function toggleAllLabelOf(areAllOpen: boolean, t: Translate) {
	if (areAllOpen) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

const SKELETON_TASK_WIDTHS = [72, 58, 66, 48, 62, 54];

function SkeletonFace({ member }: Readonly<{ member: EditsMember | undefined }>) {
	if (!member) {
		return <span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />;
	}
	return (
		<Avatar className="size-6 opacity-60">
			<AvatarImage src={member.imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[10px]" />
		</Avatar>
	);
}

function EditsRowsSkeleton({ members }: Readonly<{ members: ReadonlyArray<EditsMember> }>) {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_TASK_WIDTHS.map((taskWidth, index) => (
				<div key={index} className={cn(EDITS_GRID, 'min-h-12 py-1.5')}>
					<span className="size-4 rounded-[4px] bg-foreground/[0.05]" />
					<span className={cn('flex min-w-0 items-center gap-2.5', WIDE_ONLY)}>
						<SkeletonFace member={members[index]} />
						<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
					</span>
					<span className="flex min-w-0 flex-col gap-1.5">
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${taskWidth}%` }} />
						<span className={cn('h-2 w-24', SKELETON_BAR)} />
					</span>
					<span className={cn('h-5 w-16 rounded-md bg-foreground/[0.05]', WIDE_ONLY)} />
					<span className={cn('h-2.5 w-20', SKELETON_BAR, WIDE_ONLY)} />
					<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
					<span className={cn('size-4 justify-self-center rounded-full bg-foreground/[0.05]', WIDE_ONLY)} />
					<span className={cn('h-5 w-18 rounded-md bg-foreground/[0.05]', WIDE_ONLY)} />
					<span />
				</div>
			))}
		</div>
	);
}

export function ManualTimeEditsTableSkeleton({
	grouping = 'day',
	members = []
}: Readonly<{ grouping?: EditsGrouping; members?: ReadonlyArray<EditsMember> }>) {
	const t = useTranslations();
	const title = t(sectionTitleKeyOf(grouping));
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<TableHeader grouping={grouping} />
				<EditsRowsSkeleton members={members} />
			</div>
		</DashboardSection>
	);
}

export interface ManualTimeEditsTableProps {
	groups: ReadonlyArray<EditsGroup>;
	grouping: EditsGrouping;
	entryCount: number;
	totalSeconds: number;
	members: ReadonlyArray<EditsMember>;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: EditsFormatters;
	handlers: EditsTableHandlers;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function ManualTimeEditsTable({
	groups,
	grouping,
	entryCount,
	totalSeconds,
	members,
	selectedIdSet,
	permissions,
	formatters,
	handlers,
	isLoading,
	isUpdating,
	empty
}: Readonly<ManualTimeEditsTableProps>) {
	const t = useTranslations();
	const { overrides, toggle, setAll } = useGroupOpenState();
	const hasGroups = groups.length > 0;
	const canToggleAll = groups.length > 1;
	const areAllOpen = allGroupsOpen(groups, overrides);
	const title = t(sectionTitleKeyOf(grouping));

	if (isLoading) {
		return <ManualTimeEditsTableSkeleton grouping={grouping} members={members} />;
	}

	const toggleAll = () => {
		const keys = groups.map((group) => group.key);
		setAll(keys, !areAllOpen);
	};

	const actions = canToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabelOf(areAllOpen, t)}
		</Button>
	);

	return (
		<DashboardSection title={title} actions={actions} ariaLabel={title}>
			<div role="table" aria-busy={isUpdating}>
				<TableHeader grouping={grouping} />
				{!hasGroups && empty}
				{hasGroups && (
					<div className="hairline-divide-y divide-border">
						{groups.map((group, index) => (
							<EditsGroupBlock
								key={group.key}
								group={group}
								grouping={grouping}
								isOpen={isGroupOpen(overrides, group.key, index)}
								onToggle={toggle}
								selectedIdSet={selectedIdSet}
								permissions={permissions}
								formatters={formatters}
								handlers={handlers}
							/>
						))}
					</div>
				)}
				{hasGroups && <TotalsRow entryCount={entryCount} seconds={totalSeconds} />}
			</div>
		</DashboardSection>
	);
}

function emptyDayFormatOf(period: Period): Intl.DateTimeFormatOptions {
	const isCurrentYear = isSameYear(period.from, new Date());
	const isOneYear = isSameYear(period.from, period.to);
	const showsYear = !isCurrentYear || !isOneYear;
	if (showsYear) {
		return { month: 'short', day: 'numeric', year: 'numeric' };
	}
	return { month: 'short', day: 'numeric' };
}

function emptyTitleOf(period: Period, locale: string, t: Translate) {
	const formatter = new Intl.DateTimeFormat(locale, emptyDayFormatOf(period));
	const from = formatter.format(period.from);
	const to = formatter.format(period.to);
	const isOneDay = from === to;
	if (isOneDay) {
		return t('dashboard.manualTimeEdits.EMPTY_DAY', { day: from });
	}
	return t('dashboard.manualTimeEdits.EMPTY_RANGE', { from, to });
}

export function ManualTimeEditsEmpty({
	period,
	isFiltered,
	onClearFilters,
	onAddTime,
	onPreviousPeriod
}: Readonly<{
	period: Period;
	isFiltered: boolean;
	onClearFilters: () => void;
	onAddTime: () => void;
	onPreviousPeriod: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	if (isFiltered) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.manualTimeEdits.NO_MATCH_TITLE')}
				message={t('dashboard.manualTimeEdits.NO_MATCH_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={onClearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	return (
		<BlockEmptyMessage
			title={emptyTitleOf(period, locale, t)}
			message={t('dashboard.manualTimeEdits.EMPTY_MESSAGE')}
			action={
				<span className="flex flex-wrap items-center justify-center gap-2">
					<Button type="button" variant="outline" size="default" onClick={onAddTime}>
						<Plus />
						<span>{t('dashboard.manualTimeEdits.ADD_MANUAL_TIME')}</span>
					</Button>
					<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
						{t('dashboard.period.PREVIOUS')}
					</Button>
				</span>
			}
		/>
	);
}
