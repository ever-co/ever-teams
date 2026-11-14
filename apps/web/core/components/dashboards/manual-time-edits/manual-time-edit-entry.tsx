'use client';

import { type CSSProperties, memo, type ReactNode, useCallback, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Checkbox } from '@/core/components/common/checkbox';
import { Button } from '@/core/components/duplicated-components/_button';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ChangeSummaryLine, TimeLogHistoryView } from '@/core/components/dashboards/timesheets/time-log-history';
import { STATUS_LABEL_KEYS, TimesheetStatusGlyph } from '@/core/components/dashboards/timesheets/timesheet-status';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { ChevronDown, ChevronUp, DollarCircle, Folder, Pencil, Plus, Trash } from '@/core/components/icons';
import type { PeriodHistoryStatus } from '@/core/hooks/dashboards/manual-time-edits/use-time-log-period-history';
import { useHistoryMemberNames } from '@/core/hooks/dashboards/timesheets/use-history-member-names';
import { useTimeLogHistory } from '@/core/hooks/dashboards/timesheets/use-time-log-history';
import { imgTitle } from '@/core/lib/helpers/index';
import { cn } from '@/core/lib/helpers';
import type { TimeLogHistoryChange } from '@/core/lib/utils/time-log-history';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { timeRangeTextOf } from '@/core/lib/utils/dashboards/timesheets';
import type {
	EditsGrouping,
	EditsMember,
	ManualTimeEntry,
	RailPosition
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { DayName, type EditRowHandlers, editedWhenOf, type EditsFormatters, EntryMenu } from './manual-time-edit-row';
import { ENTRY_GRID, ENTRY_INDENT, ENTRY_ROW, railLineClassOf } from './manual-time-edits-feed-layout';

const TILE =
	'keycap-3d relative flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5 [&_svg]:shrink-0';

const CORNER_MARK =
	'keycap-3d absolute -right-1.5 -bottom-1.5 flex size-3.5 items-center justify-center rounded-[4px] [&_svg]:size-2.5';

const ADDED_TONE = 'text-primary-ink';

const EDITED_TONE = 'text-warning-foreground';

const DELETED_TONE = 'text-destructive-ink';

const TILE_YIELDS = 'transition-opacity duration-150 group-hover/entry:opacity-0 group-focus-within/lead:opacity-0';

const CHECKBOX_LAYER =
	'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/entry:opacity-100 group-focus-within/lead:opacity-100';

const INK = 'font-medium text-foreground';

const PROJECT_CHIP =
	'chip-3d ml-1.5 inline-flex h-5 max-w-44 items-center rounded-sm px-1.5 align-top text-[11px] font-medium';

const NEUTRAL_CHIP = '[--chip:hsl(var(--muted-foreground))]';

const ENTRY_SELECTED = 'bg-foreground/[0.03]';

const META_SEPARATOR = '·';

function changeLabelKeyOf(entry: ManualTimeEntry) {
	if (entry.isDeleted) {
		return 'dashboard.manualTimeEdits.DELETED' as const;
	}
	const isBoth = entry.isAdded && entry.isEdited;
	if (isBoth) {
		return 'dashboard.manualTimeEdits.ADDED_AND_EDITED' as const;
	}
	if (entry.isAdded) {
		return 'dashboard.manualTimeEdits.ADDED' as const;
	}
	return 'dashboard.manualTimeEdits.EDITED' as const;
}

function MainGlyph({ entry }: Readonly<{ entry: ManualTimeEntry }>) {
	if (entry.isDeleted) {
		return <Trash aria-hidden="true" />;
	}
	if (entry.isAdded) {
		return <Plus aria-hidden="true" />;
	}
	return <Pencil aria-hidden="true" />;
}

function mainToneOf(entry: ManualTimeEntry) {
	if (entry.isDeleted) {
		return DELETED_TONE;
	}
	if (entry.isAdded) {
		return ADDED_TONE;
	}
	return EDITED_TONE;
}

function ChangeGlyphTile({ entry, className }: Readonly<{ entry: ManualTimeEntry; className?: string }>) {
	const t = useTranslations();
	const label = t(changeLabelKeyOf(entry));
	const isBoth = entry.isAdded && entry.isEdited;
	return (
		<span role="img" aria-label={label} title={label} className={cn(TILE, mainToneOf(entry), className)}>
			<MainGlyph entry={entry} />
			{isBoth && (
				<span className={cn(CORNER_MARK, EDITED_TONE)}>
					<Pencil aria-hidden="true" />
				</span>
			)}
		</span>
	);
}

function EntryLead({
	entry,
	canEdit,
	isSelected,
	isSelecting,
	selectLabel,
	onToggle
}: Readonly<{
	entry: ManualTimeEntry;
	canEdit: boolean;
	isSelected: boolean;
	isSelecting: boolean;
	selectLabel: string;
	onToggle: () => void;
}>) {
	const showsCheckbox = isSelected || isSelecting;
	const hidesTile = canEdit && showsCheckbox;
	return (
		<span className="group/lead relative z-[1] flex size-6 items-center justify-center self-start">
			<ChangeGlyphTile entry={entry} className={cn(canEdit && TILE_YIELDS, hidesTile && 'opacity-0')} />
			{canEdit && (
				<span className={cn(CHECKBOX_LAYER, showsCheckbox && 'opacity-100')}>
					<Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={selectLabel} />
				</span>
			)}
		</span>
	);
}

export function FeedFace({
	name,
	imageUrl,
	className
}: Readonly<{ name: string; imageUrl: string | null; className?: string }>) {
	return (
		<Avatar className={cn('size-5', className)}>
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[9px]">{imgTitle(name)}</AvatarFallback>
		</Avatar>
	);
}

function taskIdOf(entry: ManualTimeEntry) {
	return entry.log.task?.id ?? entry.log.taskId ?? null;
}

function sentenceKeyOf(entry: ManualTimeEntry, hasTask: boolean) {
	if (entry.isDeleted) {
		if (hasTask) {
			return 'dashboard.manualTimeEdits.FEED_DELETED' as const;
		}
		return 'dashboard.manualTimeEdits.FEED_DELETED_NO_TASK' as const;
	}
	if (entry.isAdded) {
		if (hasTask) {
			return 'dashboard.manualTimeEdits.FEED_ADDED' as const;
		}
		return 'dashboard.manualTimeEdits.FEED_ADDED_NO_TASK' as const;
	}
	if (hasTask) {
		return 'dashboard.manualTimeEdits.FEED_EDITED' as const;
	}
	return 'dashboard.manualTimeEdits.FEED_EDITED_NO_TASK' as const;
}

/**
 * "Ana added 2h 00m to Design review", or "Ana's 2h 00m on Design review was edited": the member is the one the time
 * belongs to. An edit is told in the passive: what changed and when is on its own line, and who made it is in the
 * entry's history (an API without history keeps neither).
 */
function inkActor(chunks: ReactNode) {
	return <span className={INK}>{chunks}</span>;
}

function inkFigure(chunks: ReactNode) {
	return <span className={cn(INK, 'tabular-nums')}>{chunks}</span>;
}

function EntrySentence({ entry }: Readonly<{ entry: ManualTimeEntry }>) {
	const t = useTranslations();
	const taskId = taskIdOf(entry);
	const taskTitle = entry.taskTitle;
	const hasTaskId = Boolean(taskId);
	const hasTitle = Boolean(taskTitle);
	const hasTask = hasTaskId && hasTitle;
	const renderLink = (chunks: ReactNode) => (
		<TaskDrawerLink
			taskId={taskId ?? ''}
			prefetch={false}
			className={cn(
				INK,
				'rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25'
			)}
		>
			{chunks}
		</TaskDrawerLink>
	);
	return (
		<>
			{t.rich(sentenceKeyOf(entry, hasTask), {
				name: entry.memberName,
				duration: formatDurationShort(entry.seconds),
				task: taskTitle ?? '',
				actor: inkActor,
				figure: inkFigure,
				link: renderLink
			})}
		</>
	);
}

function chipStyleOf(color: string | null): CSSProperties | undefined {
	if (!isPaintableColor(color)) {
		return undefined;
	}
	return dataColorChipStyle(color);
}

function FeedProjectChip({ entry }: Readonly<{ entry: ManualTimeEntry }>) {
	const t = useTranslations();
	const projectName = entry.projectName;
	if (!projectName) {
		return (
			<span className="ml-1.5 inline-flex h-5 items-center gap-1 align-top text-xs text-muted-foreground [&_svg]:size-3">
				<Folder aria-hidden="true" />
				<span>{t('dashboard.timesheets.NO_PROJECT')}</span>
			</span>
		);
	}
	const style = chipStyleOf(entry.projectColor);
	const isNeutral = style === undefined;
	return (
		<span style={style} className={cn(PROJECT_CHIP, isNeutral && NEUTRAL_CHIP)}>
			<span className="truncate">{projectName}</span>
		</span>
	);
}

function MetaSeparator() {
	return <span aria-hidden="true">{META_SEPARATOR}</span>;
}

function EntryMeta({
	entry,
	grouping,
	formatters
}: Readonly<{ entry: ManualTimeEntry; grouping: EditsGrouping; formatters: EditsFormatters }>) {
	const t = useTranslations();
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const timeRange = timeRangeTextOf(entry.log, formatters, runningLabel);
	const showsDay = grouping === 'member';
	const status = entry.status;
	return (
		<p
			className={cn(
				'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums text-muted-foreground',
				ENTRY_INDENT
			)}
		>
			{showsDay && (
				<>
					<DayName day={entry.day} formatters={formatters} className="font-normal" />
					<MetaSeparator />
				</>
			)}
			<span>{timeRange}</span>
			{entry.isBillable && (
				<>
					<MetaSeparator />
					<span className="inline-flex items-center gap-1">
						<DollarCircle aria-hidden="true" className="size-3.5 text-primary-ink" />
						<span>{t('dashboard.manualTimeEdits.BILLABLE')}</span>
					</span>
				</>
			)}
			{status && (
				<>
					<MetaSeparator />
					<span className="inline-flex items-center gap-1">
						<TimesheetStatusGlyph status={status} className="size-3.5" />
						<span>{t(STATUS_LABEL_KEYS[status])}</span>
					</span>
				</>
			)}
		</p>
	);
}

function EntryReason({ reason }: Readonly<{ reason: string }>) {
	return (
		<blockquote
			title={reason}
			className="ml-7 line-clamp-3 whitespace-pre-line rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 text-xs leading-5 text-foreground/80 [overflow-wrap:anywhere]"
		>
			{reason}
		</blockquote>
	);
}

function LastChangeSummary({
	change,
	formatters
}: Readonly<{ change: TimeLogHistoryChange; formatters: EditsFormatters }>) {
	const memberNameOf = useHistoryMemberNames();
	return <ChangeSummaryLine change={change} formatters={formatters} memberNameOf={memberNameOf} />;
}

function HistoryToggle({
	isOpen,
	controlsId,
	onToggle
}: Readonly<{ isOpen: boolean; controlsId: string; onToggle: () => void }>) {
	const t = useTranslations();
	let icon = <ChevronDown />;
	let label = t('dashboard.manualTimeEdits.SHOW_HISTORY');
	if (isOpen) {
		icon = <ChevronUp />;
		label = t('dashboard.manualTimeEdits.HIDE_HISTORY');
	}
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-expanded={isOpen}
			aria-controls={controlsId}
			onClick={onToggle}
			className="-my-1 h-6 px-1.5 text-xs text-muted-foreground"
		>
			<span>{label}</span>
			{icon}
		</Button>
	);
}

/** Whether the row can open the entry's history: the API keeps one, and there is something in it to read. */
function opensHistoryOf(entry: ManualTimeEntry, historyStatus: PeriodHistoryStatus) {
	const isKept = historyStatus === 'ready';
	const hasChange = entry.lastChange !== null;
	return isKept && hasChange;
}

/**
 * What changed, on one line: "Deleted Nov 12, 08:00", or the last edit's fields before and after with when it was
 * made. An entry edited before the history was kept says so; while the history loads, or on an API without it, the
 * line says when the entry was edited, as it always did.
 */
function ChangeLine({
	entry,
	when,
	historyStatus,
	formatters,
	toggle
}: Readonly<{
	entry: ManualTimeEntry;
	when: string | null;
	historyStatus: PeriodHistoryStatus;
	formatters: EditsFormatters;
	toggle: ReactNode;
}>) {
	const t = useTranslations();
	const lastChange = entry.lastChange;
	const isUpdate = lastChange?.action === 'updated';
	const isNotKept = historyStatus === 'ready' && lastChange === null;
	const whenText = whenTextOf(entry, when, t);
	return (
		<div
			className={cn(
				'flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 text-xs tabular-nums text-muted-foreground',
				ENTRY_INDENT
			)}
		>
			<span className="flex min-w-0 items-start gap-1">
				<ChangeLineGlyph isDeleted={entry.isDeleted} />
				{lastChange && isUpdate && <LastChangeSummary change={lastChange} formatters={formatters} />}
				{!isUpdate && whenText && <span>{whenText}</span>}
			</span>
			{isUpdate && whenText && <span>{whenText}</span>}
			{isNotKept && <span>{t('dashboard.manualTimeEdits.NOT_KEPT')}</span>}
			{toggle}
		</div>
	);
}

function ChangeLineGlyph({ isDeleted }: Readonly<{ isDeleted: boolean }>) {
	if (isDeleted) {
		return <Trash aria-hidden="true" className={cn('mt-0.5 size-3 shrink-0', DELETED_TONE)} />;
	}
	return <Pencil aria-hidden="true" className={cn('mt-0.5 size-3 shrink-0', EDITED_TONE)} />;
}

function whenTextOf(entry: ManualTimeEntry, when: string | null, t: ReturnType<typeof useTranslations>) {
	if (!when) {
		return null;
	}
	if (entry.isDeleted) {
		return t('dashboard.manualTimeEdits.DELETED_AT', { when });
	}
	return t('dashboard.manualTimeEdits.EDITED_AT', { when });
}

function EntryHistoryPanel({
	entryId,
	panelId,
	formatters
}: Readonly<{ entryId: string; panelId: string; formatters: EditsFormatters }>) {
	const history = useTimeLogHistory(entryId, true);
	const memberNameOf = useHistoryMemberNames();
	return (
		<div id={panelId} className="ml-7 rounded-lg bg-foreground/[0.02] px-3 py-2.5 hairline-ring ring-border">
			<TimeLogHistoryView
				state={history}
				formatters={formatters}
				memberNameOf={memberNameOf}
				onRetry={history.refetch}
			/>
		</div>
	);
}

export const ManualTimeEditEntry = memo(function ManualTimeEditEntry({
	entry,
	grouping,
	railPosition,
	isSelected,
	isSelecting,
	canEdit,
	historyStatus,
	formatters,
	handlers
}: Readonly<{
	entry: ManualTimeEntry;
	grouping: EditsGrouping;
	railPosition: RailPosition;
	isSelected: boolean;
	isSelecting: boolean;
	canEdit: boolean;
	historyStatus: PeriodHistoryStatus;
	formatters: EditsFormatters;
	handlers: EditRowHandlers;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const panelId = useId();
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const taskName = entry.taskTitle ?? t('dashboard.timesheets.NO_TASK');
	const selectLabel = t('dashboard.timesheets.SELECT_LOG', { task: taskName });
	const editedWhen = editedWhenOf(entry, locale, formatters);
	const reason = entry.reason;
	const entryKey = entry.key;
	const { toggleEntry } = handlers;
	const handleToggle = useCallback(() => toggleEntry(entryKey), [entryKey, toggleEntry]);
	const toggleHistory = useCallback(() => setIsHistoryOpen((current) => !current), []);
	const opensHistory = opensHistoryOf(entry, historyStatus);
	const showsChangeLine = entry.isDeleted || Boolean(editedWhen);
	const showsHistory = opensHistory && isHistoryOpen;
	let toggle: ReactNode = null;
	if (opensHistory) {
		toggle = <HistoryToggle isOpen={isHistoryOpen} controlsId={panelId} onToggle={toggleHistory} />;
	}

	return (
		<li className={cn(ENTRY_GRID, ENTRY_ROW, 'group/entry', isSelected && ENTRY_SELECTED)}>
			<span aria-hidden="true" className={railLineClassOf(railPosition)} />
			<EntryLead
				entry={entry}
				canEdit={canEdit}
				isSelected={isSelected}
				isSelecting={isSelecting}
				selectLabel={selectLabel}
				onToggle={handleToggle}
			/>
			<div className="flex min-w-0 flex-col gap-1.5">
				<div className="flex min-w-0 items-start gap-2">
					<FeedFace name={entry.memberName} imageUrl={entry.memberImageUrl} className="mt-px" />
					<p className="min-w-0 text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
						<EntrySentence entry={entry} />
						<FeedProjectChip entry={entry} />
					</p>
				</div>
				<EntryMeta entry={entry} grouping={grouping} formatters={formatters} />
				{reason && <EntryReason reason={reason} />}
				{showsChangeLine && (
					<ChangeLine
						entry={entry}
						when={editedWhen}
						historyStatus={historyStatus}
						formatters={formatters}
						toggle={toggle}
					/>
				)}
				{showsHistory && <EntryHistoryPanel entryId={entryKey} panelId={panelId} formatters={formatters} />}
			</div>
			<div className="-mt-0.5 flex justify-end">{canEdit && <EntryMenu entry={entry} handlers={handlers} />}</div>
		</li>
	);
});

export function ManualTimeEditEntrySkeleton({
	member,
	sentenceWidth,
	railPosition
}: Readonly<{ member: EditsMember | undefined; sentenceWidth: string; railPosition: RailPosition }>) {
	let face = <span className="mt-px size-5 shrink-0 rounded-full bg-foreground/[0.06]" />;
	if (member) {
		face = <FeedFace name={member.name} imageUrl={member.imageUrl} className="mt-px opacity-60" />;
	}
	return (
		<li className={ENTRY_GRID} aria-hidden="true">
			<span className={railLineClassOf(railPosition)} />
			<span className="relative z-[1] size-6 rounded-md keycap-3d" />
			<span className="flex min-w-0 flex-col gap-2">
				<span className="flex min-w-0 items-center gap-2">
					{face}
					<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: sentenceWidth }} />
				</span>
				<span className={cn('ml-7 h-2 w-32', SKELETON_BAR)} />
			</span>
			<span />
		</li>
	);
}
