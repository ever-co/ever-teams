'use client';

import { type CSSProperties, memo, type ReactNode, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Checkbox } from '@/core/components/common/checkbox';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { STATUS_LABEL_KEYS, TimesheetStatusGlyph } from '@/core/components/dashboards/timesheets/timesheet-status';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { DollarCircle, Folder, Pencil, Plus } from '@/core/components/icons';
import { imgTitle } from '@/core/lib/helpers/index';
import { cn } from '@/core/lib/helpers';
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
	const isBoth = entry.isAdded && entry.isEdited;
	if (isBoth) {
		return 'dashboard.manualTimeEdits.ADDED_AND_EDITED' as const;
	}
	if (entry.isAdded) {
		return 'dashboard.manualTimeEdits.ADDED' as const;
	}
	return 'dashboard.manualTimeEdits.EDITED' as const;
}

function MainGlyph({ isAdded }: Readonly<{ isAdded: boolean }>) {
	if (isAdded) {
		return <Plus aria-hidden="true" />;
	}
	return <Pencil aria-hidden="true" />;
}

function mainToneOf(isAdded: boolean) {
	if (isAdded) {
		return ADDED_TONE;
	}
	return EDITED_TONE;
}

function ChangeGlyphTile({ entry, className }: Readonly<{ entry: ManualTimeEntry; className?: string }>) {
	const t = useTranslations();
	const label = t(changeLabelKeyOf(entry));
	const isBoth = entry.isAdded && entry.isEdited;
	return (
		<span role="img" aria-label={label} title={label} className={cn(TILE, mainToneOf(entry.isAdded), className)}>
			<MainGlyph isAdded={entry.isAdded} />
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
 * belongs to. Gauzy keeps neither the editor of a log nor its previous start and end, so an edit is told in the
 * passive, with when it happened on its own line.
 */
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
				actor: (chunks) => <span className={INK}>{chunks}</span>,
				figure: (chunks) => <span className={cn(INK, 'tabular-nums')}>{chunks}</span>,
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

function EditedLine({ when }: Readonly<{ when: string }>) {
	const t = useTranslations();
	return (
		<p className={cn('flex min-w-0 items-center gap-1 text-xs text-muted-foreground', ENTRY_INDENT)}>
			<Pencil aria-hidden="true" className={cn('size-3 shrink-0', EDITED_TONE)} />
			<span className="truncate tabular-nums">{t('dashboard.manualTimeEdits.EDITED_AT', { when })}</span>
		</p>
	);
}

export const ManualTimeEditEntry = memo(function ManualTimeEditEntry({
	entry,
	grouping,
	railPosition,
	isSelected,
	isSelecting,
	canEdit,
	formatters,
	handlers
}: Readonly<{
	entry: ManualTimeEntry;
	grouping: EditsGrouping;
	railPosition: RailPosition;
	isSelected: boolean;
	isSelecting: boolean;
	canEdit: boolean;
	formatters: EditsFormatters;
	handlers: EditRowHandlers;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const taskName = entry.taskTitle ?? t('dashboard.timesheets.NO_TASK');
	const selectLabel = t('dashboard.timesheets.SELECT_LOG', { task: taskName });
	const editedWhen = editedWhenOf(entry, locale, formatters);
	const reason = entry.reason;
	const entryKey = entry.key;
	const { toggleEntry } = handlers;
	const handleToggle = useCallback(() => toggleEntry(entryKey), [entryKey, toggleEntry]);

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
				{editedWhen && <EditedLine when={editedWhen} />}
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
