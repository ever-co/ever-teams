'use client';

import { memo, type ReactNode, useCallback, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ChevronDown, ChevronUp, Trash } from '@/core/components/icons';
import type { TrackedShare } from '@/core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report';
import { canEditLog, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	type ChangeAction,
	type EditsFigures,
	type EditsGroup,
	type EditsGrouping,
	type EditsMember,
	FEED_VISIBLE_ENTRIES,
	type ManualTimeEntry,
	railPositionOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { ManualTimeEditEntry, ManualTimeEditEntrySkeleton } from './manual-time-edit-entry';
import { DayName, type EditsFormatters } from './manual-time-edit-row';
import { FEED_COLUMN, GROUP_HEADER } from './manual-time-edits-feed-layout';
import { ManualTimeEditsFeedHead, ManualTimeEditsFeedHeadSkeleton } from './manual-time-edits-feed-head';
import { type EditsTableHandlers, type GroupSelection, groupSelectionOf } from './manual-time-edits-table';

type Translate = ReturnType<typeof useTranslations>;

const DESTRUCTIVE_GHOST = 'text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink';

function GroupTitle({ group, formatters }: Readonly<{ group: EditsGroup; formatters: EditsFormatters }>) {
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

function GroupTotals({ group }: Readonly<{ group: EditsGroup }>) {
	const t = useTranslations();
	return (
		<span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
			<span className="text-xs text-muted-foreground">
				{t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: group.entries.length })}
			</span>
			<span aria-hidden="true" className="text-xs text-muted-foreground">
				·
			</span>
			<span className="text-[13px] font-semibold text-foreground">{formatDurationShort(group.seconds)}</span>
		</span>
	);
}

function selectAllLabelOf(isEverySelected: boolean, t: Translate) {
	if (isEverySelected) {
		return t('common.CLEAR');
	}
	return t('dashboard.manualTimeEdits.FEED_SELECT_ALL');
}

function GroupSelectionActions({
	selection,
	groupLabel,
	onSelectAll,
	onDelete
}: Readonly<{
	selection: GroupSelection;
	groupLabel: string;
	onSelectAll: () => void;
	onDelete: () => void;
}>) {
	const t = useTranslations();
	const selectedCount = selection.selectedEntries.length;
	return (
		<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
			<span className="tabular-nums">
				{t('dashboard.manualTimeEdits.SELECTED_COUNT', { count: selectedCount })}
			</span>
			<span aria-hidden="true">·</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onSelectAll}
				aria-label={t('dashboard.manualTimeEdits.SELECT_GROUP', { group: groupLabel })}
			>
				{selectAllLabelOf(selection.isChecked, t)}
			</Button>
			<span aria-hidden="true">·</span>
			<Button type="button" variant="ghost" size="sm" onClick={onDelete} className={DESTRUCTIVE_GHOST}>
				<Trash />
				<span>{t('common.DELETE')}</span>
			</Button>
		</span>
	);
}

function shownEntriesOf(entries: ManualTimeEntry[], isCollapsed: boolean) {
	if (isCollapsed) {
		return entries.slice(0, FEED_VISIBLE_ENTRIES);
	}
	return entries;
}

function ShowMoreToggle({
	isExpanded,
	hiddenCount,
	onToggle
}: Readonly<{ isExpanded: boolean; hiddenCount: number; onToggle: () => void }>) {
	const t = useTranslations();
	let icon = <ChevronDown />;
	let label = t('dashboard.manualTimeEdits.FEED_SHOW_MORE', { count: hiddenCount });
	if (isExpanded) {
		icon = <ChevronUp />;
		label = t('dashboard.manualTimeEdits.FEED_SHOW_FEWER');
	}
	return (
		<div className="px-3 py-1.5 sm:px-4">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-expanded={isExpanded}
				onClick={onToggle}
				className="ml-6.5 text-muted-foreground"
			>
				{icon}
				<span>{label}</span>
			</Button>
		</div>
	);
}

const FeedGroup = memo(function FeedGroup({
	group,
	grouping,
	isExpanded,
	onToggleExpanded,
	isSelecting,
	selectedIdSet,
	permissions,
	formatters,
	handlers
}: Readonly<{
	group: EditsGroup;
	grouping: EditsGrouping;
	isExpanded: boolean;
	onToggleExpanded: (key: string, wasExpanded: boolean) => void;
	isSelecting: boolean;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: EditsFormatters;
	handlers: EditsTableHandlers;
}>) {
	const headingId = useId();
	const selection = groupSelectionOf(group, selectedIdSet, permissions);
	const hasSelection = selection.selectedEntries.length > 0;
	const groupLabel = groupLabelOf(group, formatters);
	const entryCount = group.entries.length;
	const hiddenCount = entryCount - FEED_VISIBLE_ENTRIES;
	const isLong = hiddenCount > 0;
	const isCollapsed = isLong && !isExpanded;
	const shownEntries = shownEntriesOf(group.entries, isCollapsed);
	const shownCount = shownEntries.length;
	const { selectEntries, removeSelected } = handlers;
	const { selectableIds, selectedEntries, isChecked } = selection;
	const groupKey = group.key;

	const selectAll = () => selectEntries(selectableIds, !isChecked);
	const deleteSelected = () => removeSelected(selectedEntries);
	const toggleExpanded = () => onToggleExpanded(groupKey, isExpanded);

	let trailing = <GroupTotals group={group} />;
	if (hasSelection) {
		trailing = (
			<GroupSelectionActions
				selection={selection}
				groupLabel={groupLabel}
				onSelectAll={selectAll}
				onDelete={deleteSelected}
			/>
		);
	}

	return (
		<section aria-labelledby={headingId} className="flex min-w-0 flex-col">
			<div className={GROUP_HEADER}>
				<h3 id={headingId} className="flex min-w-0 items-center text-[13px] text-foreground">
					<GroupTitle group={group} formatters={formatters} />
				</h3>
				{trailing}
			</div>
			<div className={DASHBOARD_SURFACE}>
				<ol className="flex flex-col py-1">
					{shownEntries.map((entry, index) => (
						<ManualTimeEditEntry
							key={entry.key}
							entry={entry}
							grouping={grouping}
							railPosition={railPositionOf(index, shownCount)}
							isSelected={selectedIdSet.has(entry.key)}
							isSelecting={isSelecting}
							canEdit={canEditLog(entry.log, permissions)}
							formatters={formatters}
							handlers={handlers}
						/>
					))}
				</ol>
				{isLong && (
					<ShowMoreToggle isExpanded={isExpanded} hiddenCount={hiddenCount} onToggle={toggleExpanded} />
				)}
			</div>
		</section>
	);
});

function useExpandedGroups() {
	const [expanded, setExpanded] = useState<Readonly<Record<string, boolean>>>({});
	const toggle = useCallback((key: string, wasExpanded: boolean) => {
		setExpanded((current) => ({ ...current, [key]: !wasExpanded }));
	}, []);
	return { expanded, toggle };
}

function isGroupExpanded(expanded: Readonly<Record<string, boolean>>, key: string) {
	return expanded[key] === true;
}

export interface ManualTimeEditsFeedProps {
	figures: EditsFigures;
	actionFigures: EditsFigures | null;
	share: TrackedShare;
	action: ChangeAction;
	onActionChange: (action: ChangeAction) => void;
	groups: ReadonlyArray<EditsGroup>;
	grouping: EditsGrouping;
	members: ReadonlyArray<EditsMember>;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: EditsFormatters;
	handlers: EditsTableHandlers;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function ManualTimeEditsFeed({
	figures,
	actionFigures,
	share,
	action,
	onActionChange,
	groups,
	grouping,
	members,
	selectedIdSet,
	permissions,
	formatters,
	handlers,
	isLoading,
	isUpdating,
	empty
}: Readonly<ManualTimeEditsFeedProps>) {
	const t = useTranslations();
	const { expanded, toggle } = useExpandedGroups();
	const hasGroups = groups.length > 0;
	const isSelecting = selectedIdSet.size > 0;

	if (isLoading) {
		return <ManualTimeEditsFeedSkeleton members={members} />;
	}

	return (
		<section aria-label={t('dashboard.manualTimeEdits.FEED_LABEL')} aria-busy={isUpdating} className={FEED_COLUMN}>
			<ManualTimeEditsFeedHead
				figures={figures}
				actionFigures={actionFigures}
				share={share}
				action={action}
				onActionChange={onActionChange}
			/>
			{!hasGroups && <div className={DASHBOARD_SURFACE}>{empty}</div>}
			{groups.map((group) => (
				<FeedGroup
					key={group.key}
					group={group}
					grouping={grouping}
					isExpanded={isGroupExpanded(expanded, group.key)}
					onToggleExpanded={toggle}
					isSelecting={isSelecting}
					selectedIdSet={selectedIdSet}
					permissions={permissions}
					formatters={formatters}
					handlers={handlers}
				/>
			))}
		</section>
	);
}

interface SkeletonGroup {
	key: string;
	titleWidth: string;
	sentenceWidths: string[];
	memberOffset: number;
}

const SKELETON_GROUPS: ReadonlyArray<SkeletonGroup> = [
	{ key: 'first', titleWidth: 'w-28', sentenceWidths: ['72%', '58%', '66%', '48%'], memberOffset: 0 },
	{ key: 'second', titleWidth: 'w-24', sentenceWidths: ['62%', '54%', '70%'], memberOffset: 4 }
];

export function ManualTimeEditsFeedSkeleton({ members = [] }: Readonly<{ members?: ReadonlyArray<EditsMember> }>) {
	return (
		<div className={FEED_COLUMN} aria-busy="true">
			<ManualTimeEditsFeedHeadSkeleton />
			{SKELETON_GROUPS.map((group) => {
				const count = group.sentenceWidths.length;
				return (
					<div key={group.key} className="flex min-w-0 flex-col" aria-hidden="true">
						<div className={GROUP_HEADER}>
							<span className={cn('h-2.5', group.titleWidth, SKELETON_BAR)} />
							<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
						</div>
						<ol className={cn(DASHBOARD_SURFACE, 'flex flex-col py-1')}>
							{group.sentenceWidths.map((width, index) => {
								const memberIndex = group.memberOffset + index;
								return (
									<ManualTimeEditEntrySkeleton
										key={`${group.key}-${index}`}
										member={members[memberIndex]}
										sentenceWidth={width}
										railPosition={railPositionOf(index, count)}
									/>
								);
							})}
						</ol>
					</div>
				);
			})}
		</div>
	);
}
