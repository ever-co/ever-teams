'use client';

import { type FocusEvent, type KeyboardEvent, type MouseEvent, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CellCommitOutcome } from '@/core/hooks/dashboards/timesheets/use-sheet-cell-writes';
import type { SheetCellTarget } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { type CellLock, parseDurationInput, wholeMinutesOf } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import type { SheetCell, SheetDay, SheetRowIdentity } from '@/core/lib/utils/dashboards/timesheets';
import { WEEKEND_CELL } from './timesheets-sheet-grid';

const MISSING_VALUE = '–';

const CELL_BUTTON =
	'flex h-full min-h-10 w-full items-center justify-center rounded-md text-[13px] tabular-nums text-foreground outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

const CELL_INPUT =
	'h-full min-h-10 w-full min-w-0 rounded-md bg-transparent px-1 text-center text-[13px] tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-foreground/[0.03] focus:bg-card focus:hairline-ring focus:ring-border focus-visible:ring-[3px] focus-visible:ring-ring/25 read-only:cursor-progress read-only:text-muted-foreground';

/** An empty cell that can take time reads as a slot to fill: a faint dashed outline, stronger under the pointer. */
const EMPTY_CELL_INPUT = 'hairline-border border-dashed border-foreground/15 hover:border-foreground/30';

/**
 * A day column can be as narrow as the duration it shows, so the way into a cell's entries takes no room beside the
 * value: a dot in the corner marks a cell that has entries, and the count button takes its place while the cell is
 * under the pointer, holds the focus or has its entries open.
 */
const ENTRIES_MARKER =
	'pointer-events-none absolute top-1.5 right-1.5 size-1 rounded-full bg-foreground/30 transition-opacity group-focus-within/cell:opacity-0 group-hover/cell:opacity-0';

const ENTRIES_BUTTON =
	'pointer-events-none absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-[5px] bg-card px-0.5 text-[10px] font-medium tabular-nums text-muted-foreground opacity-0 hairline-ring ring-border outline-none transition-opacity group-focus-within/cell:pointer-events-auto group-focus-within/cell:opacity-100 group-hover/cell:pointer-events-auto group-hover/cell:opacity-100 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:pointer-events-auto aria-expanded:text-foreground aria-expanded:opacity-100';

const DAY_LOCK_KEYS: Partial<Record<CellLock, string>> = {
	future: 'dashboard.timesheets.SHEET.EDIT.LOCK_FUTURE',
	approved: 'dashboard.timesheets.SHEET.EDIT.LOCK_APPROVED',
	running: 'dashboard.timesheets.SHEET.EDIT.LOCK_RUNNING'
};

function weekendClassOf(day: SheetDay) {
	if (day.isWeekend) {
		return WEEKEND_CELL;
	}
	return undefined;
}

function savedTextOf(seconds: number) {
	const shownSeconds = wholeMinutesOf(seconds);
	if (shownSeconds <= 0) {
		return '';
	}
	return formatDurationShort(shownSeconds);
}

interface SheetCellProps {
	identity: SheetRowIdentity;
	cell: SheetCell | undefined;
	day: SheetDay;
	lock: CellLock;
	isSaving: boolean;
	label: string;
	entriesLabel: string;
	isEntriesOpen: boolean;
	onOpenEntries: (target: SheetCellTarget) => void;
	onCommit: (identity: SheetRowIdentity, day: SheetDay, seconds: number) => Promise<CellCommitOutcome>;
}

function ReadOnlyCell({
	cell,
	day,
	lock,
	identity,
	entriesLabel,
	isEntriesOpen,
	onOpenEntries
}: Readonly<SheetCellProps>) {
	const t = useTranslations();
	const lockKey = DAY_LOCK_KEYS[lock];
	let lockText: string | undefined;
	if (lockKey) {
		lockText = t(lockKey as DottedLanguageObjectStringPaths);
	}
	if (!cell) {
		return (
			<span
				role="cell"
				title={lockText}
				className={cn(
					'flex items-center justify-center text-[13px] text-muted-foreground',
					weekendClassOf(day)
				)}
			>
				<span aria-hidden="true">{MISSING_VALUE}</span>
				<span className="sr-only">{t('dashboard.timesheets.SHEET.NO_TIME')}</span>
			</span>
		);
	}
	const openEntries = (event: MouseEvent<HTMLButtonElement>) => {
		onOpenEntries({ rowKey: identity.key, dayKey: day.key, anchor: event.currentTarget });
	};
	return (
		<span role="cell" className={cn('flex p-1', weekendClassOf(day))}>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={isEntriesOpen}
				aria-label={entriesLabel}
				title={lockText}
				onClick={openEntries}
				className={cn(CELL_BUTTON, isEntriesOpen && 'bg-foreground/[0.03]')}
			>
				{formatDurationShort(cell.seconds)}
			</button>
		</span>
	);
}

function EditableCell({
	identity,
	cell,
	day,
	isSaving,
	label,
	isEntriesOpen,
	onOpenEntries,
	onCommit
}: Readonly<SheetCellProps>) {
	const t = useTranslations();
	const seconds = cell?.seconds ?? 0;
	const savedText = savedTextOf(seconds);
	const [draft, setDraft] = useState(savedText);
	const [lastSavedText, setLastSavedText] = useState<string | null>(savedText);
	const [isEditing, setIsEditing] = useState(false);
	const skipsCommitRef = useRef(false);

	if (savedText !== lastSavedText) {
		setLastSavedText(savedText);
		if (!isEditing) {
			setDraft(savedText);
		}
	}

	const entryCount = cell?.logs.length ?? 0;
	const hasEntries = entryCount > 0;
	const isEmpty = !savedText;

	const commit = async () => {
		const typedSeconds = parseDurationInput(draft);
		if (typedSeconds === null) {
			toast.error(t('dashboard.timesheets.SHEET.EDIT.INVALID_TITLE'), {
				description: t('dashboard.timesheets.SHEET.EDIT.INVALID')
			});
			setDraft(savedText);
			return;
		}
		const savedSeconds = wholeMinutesOf(seconds);
		if (typedSeconds === savedSeconds) {
			setDraft(savedText);
			return;
		}
		const outcome = await onCommit(identity, day, typedSeconds);
		if (outcome === 'refused') {
			// The sheet was read again meanwhile: the next render puts back what is saved by then, not what was here.
			setLastSavedText(null);
		}
	};

	const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
		setIsEditing(true);
		event.currentTarget.select();
	};

	const handleBlur = () => {
		setIsEditing(false);
		if (skipsCommitRef.current) {
			skipsCommitRef.current = false;
			return;
		}
		void commit();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.currentTarget.blur();
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			skipsCommitRef.current = true;
			setDraft(savedText);
			event.currentTarget.blur();
		}
	};

	const openEntries = (event: MouseEvent<HTMLButtonElement>) => {
		onOpenEntries({ rowKey: identity.key, dayKey: day.key, anchor: event.currentTarget });
	};

	return (
		<span role="cell" className={cn('group/cell relative flex p-1', weekendClassOf(day))}>
			{/* size 1: an input's default width of 20 characters would set the width of every day column. */}
			<input
				type="text"
				size={1}
				inputMode="decimal"
				autoComplete="off"
				spellCheck={false}
				value={draft}
				placeholder={MISSING_VALUE}
				aria-label={label}
				aria-busy={isSaving}
				readOnly={isSaving}
				onChange={(event) => setDraft(event.target.value)}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={cn(CELL_INPUT, isEmpty && EMPTY_CELL_INPUT)}
			/>
			{hasEntries && <span aria-hidden="true" className={ENTRIES_MARKER} />}
			{hasEntries && (
				<button
					type="button"
					aria-haspopup="dialog"
					aria-expanded={isEntriesOpen}
					aria-label={t('dashboard.timesheets.SHEET.EDIT.SHOW_ENTRIES', { count: entryCount })}
					onClick={openEntries}
					className={ENTRIES_BUTTON}
				>
					{entryCount}
				</button>
			)}
		</span>
	);
}

export function SheetDayCell(props: Readonly<SheetCellProps>) {
	if (props.lock === 'none') {
		return <EditableCell {...props} />;
	}
	return <ReadOnlyCell {...props} />;
}
