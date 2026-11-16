'use client';

import { type ReactNode, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { Input } from '@/core/components/common/input';
import { TimeField } from '@/core/components/common/time-field';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronsUpDown, CircleAlert, Info, Plus, Scissors, Spinner, X } from '@/core/components/icons';
import { TaskPickerMenu } from '@/core/components/tasks/detail/task-picker-menu';
import {
	type CalendarEntrySplit,
	type CalendarSplitFailure,
	type SplitTask,
	useCalendarEntrySplit
} from '@/core/hooks/calendar/use-calendar-entry-split';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { cn } from '@/core/lib/helpers';
import {
	clockTextOf,
	defaultSplitTimeOf,
	isSlotMark,
	nearestSlotMarksOf,
	SLOT_MINUTES,
	type SplitRefusal,
	splitPartsOf,
	splitsOnSlots,
	splitTimeFromClock
} from '@/core/lib/utils/calendar-split';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { entryRangeTextOf, ProjectDot, useEntryTitle } from './calendar-entry-parts';

const MILLISECONDS_PER_SECOND = 1000;

/** The longest reason an entry keeps (Gauzy stores it in a 255-character column). */
const REASON_MAX_LENGTH = 255;

const REFUSAL_KEYS: Record<Exclude<SplitRefusal, 'none'>, DottedLanguageObjectStringPaths> = {
	tracked: 'dashboard.calendar.SPLIT.REFUSED.TRACKED',
	running: 'dashboard.calendar.SPLIT.REFUSED.RUNNING',
	'too-short': 'dashboard.calendar.SPLIT.REFUSED.TOO_SHORT',
	approved: 'dashboard.calendar.SPLIT.REFUSED.APPROVED',
	permission: 'dashboard.calendar.SPLIT.REFUSED.PERMISSION'
};

/**
 * What the dialog says after a split that did not go through: the outcomes of the two writes, then the reasons the API
 * refused it for (off a 10-minute mark, the time field names the marks; the notice recalls the rule).
 */
const FAILURE_NOTICE_KEYS: Partial<Record<CalendarSplitFailure, DottedLanguageObjectStringPaths>> = {
	overlap: 'dashboard.calendar.DRAG.OVERLAP',
	changed: 'dashboard.calendar.SPLIT.FAILED_CHANGED',
	unknown: 'dashboard.calendar.SPLIT.FAILED_UNKNOWN',
	restored: 'dashboard.calendar.SPLIT.FAILED_RESTORED',
	'off-slot': 'dashboard.calendar.SPLIT.SLOT_STEP',
	tracked: 'dashboard.calendar.SPLIT.REFUSED.TRACKED',
	running: 'dashboard.calendar.SPLIT.REFUSED.RUNNING',
	approved: 'dashboard.calendar.SPLIT.REFUSED.APPROVED',
	invoiced: 'dashboard.calendar.SPLIT.REFUSED.INVOICED',
	permission: 'dashboard.calendar.SPLIT.REFUSED.PERMISSION',
	'too-short': 'dashboard.calendar.SPLIT.TIME_OUTSIDE',
	'reason-required': 'dashboard.calendar.SPLIT.REASON_REQUIRED',
	'reason-too-long': 'dashboard.calendar.SPLIT.REASON_TOO_LONG',
	retry: 'dashboard.calendar.SPLIT.FAILED_RETRY'
};

/** The failures after which another try cannot go better, or could write over what was saved: only Close is left. */
const FINAL_FAILURES = new Set<CalendarSplitFailure>([
	'first-part-kept',
	'unknown',
	'tracked',
	'running',
	'approved',
	'invoiced',
	'permission'
]);

/** The failures that ask for a reason, which the form then shows a field for. */
const REASON_FAILURES = new Set<CalendarSplitFailure>(['reason-required', 'reason-too-long']);

/** The failures whose outcome is not known yet: the next try sends the same split, so the fields stay as sent. */
const UNSETTLED_FAILURES = new Set<CalendarSplitFailure>(['retry']);

const NOTICE = 'mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] leading-5';

const TASK_TRIGGER =
	'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-foreground outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/[0.03] disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

function windowTextOf(window: TimeWindow, formatters: TimesheetFormatters) {
	return `${formatters.time(window.start)} – ${formatters.time(window.end)}`;
}

function durationOf(window: TimeWindow) {
	const milliseconds = window.end.getTime() - window.start.getTime();
	return formatDurationShort(Math.round(milliseconds / MILLISECONDS_PER_SECOND));
}

function PartRow({
	label,
	window,
	formatters,
	children
}: Readonly<{ label: string; window: TimeWindow; formatters: TimesheetFormatters; children: ReactNode }>) {
	return (
		<li className="flex min-w-0 flex-col gap-1.5 px-3.5 py-2.5">
			<div className="flex items-baseline justify-between gap-3 text-[13px] tabular-nums">
				<span className="text-muted-foreground">{label}</span>
				<span className="text-foreground">
					{windowTextOf(window, formatters)}
					<span className="ml-2 font-medium">{durationOf(window)}</span>
				</span>
			</div>
			<div className="flex min-w-0 items-center">{children}</div>
		</li>
	);
}

function FailureNotice({
	text,
	actionLabel,
	onAction
}: Readonly<{ text: string; actionLabel?: string; onAction?: () => void }>) {
	return (
		<div role="alert" className={cn(NOTICE, 'flex-col bg-destructive/[0.06] text-foreground')}>
			<span className="flex items-start gap-2">
				<CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive-ink" />
				<span>{text}</span>
			</span>
			{actionLabel && onAction && (
				<Button type="button" variant="outline" size="sm" onClick={onAction} className="ml-6">
					<Plus />
					{actionLabel}
				</Button>
			)}
		</div>
	);
}

/** The task the second part takes, as the split sends it: none keeps the entry's own. */
function splitTaskOf(task: TTask | null): SplitTask | null {
	if (!task) {
		return null;
	}
	return { id: task.id, projectId: task.projectId ?? null };
}

/**
 * What is wrong with the split time, if anything: outside the entry, or off a 10-minute mark of tracked time, with the
 * nearest marks written as the entry's times are, on the workspace's clock.
 */
function useSplitTimeError(
	window: TimeWindow,
	splitAt: Date | null,
	isOffSlot: boolean,
	formatters: TimesheetFormatters
): string | null {
	const t = useTranslations();
	if (!splitAt) {
		return t('dashboard.calendar.SPLIT.TIME_OUTSIDE');
	}
	if (!isOffSlot) {
		return null;
	}
	const { before, after } = nearestSlotMarksOf(window, splitAt);
	const marks = [before, after].filter((mark): mark is Date => mark !== null).map(formatters.time);
	if (marks.length === 2) {
		return t('dashboard.calendar.SPLIT.OFF_SLOT', { before: marks[0], after: marks[1] });
	}
	if (marks.length === 1) {
		return t('dashboard.calendar.SPLIT.OFF_SLOT_ONE', { time: marks[0] });
	}
	return t('dashboard.calendar.SPLIT.TIME_OUTSIDE');
}

/** Why the last split did not go through, with the way out of a first part saved without its second. */
function SplitFailureNotice({
	failure,
	parts,
	formatters,
	onAddRest
}: Readonly<{
	failure: CalendarSplitFailure | null;
	parts: ReturnType<typeof splitPartsOf> | null;
	formatters: TimesheetFormatters;
	onAddRest: () => void;
}>) {
	const t = useTranslations();
	if (failure === null) {
		return null;
	}
	if (failure === 'first-part-kept') {
		if (!parts) {
			return null;
		}
		const range = windowTextOf(parts.second, formatters);
		return (
			<FailureNotice
				text={t('dashboard.calendar.SPLIT.FAILED_FIRST_PART_KEPT', { range })}
				actionLabel={t('dashboard.calendar.SPLIT.ADD_REST')}
				onAction={onAddRest}
			/>
		);
	}
	const key = FAILURE_NOTICE_KEYS[failure];
	if (!key) {
		return null;
	}
	return <FailureNotice text={t(key)} />;
}

function SplitForm({
	entry,
	formatters,
	split,
	viaApi,
	onClose,
	onAddTime
}: Readonly<{
	entry: CalendarEntry;
	formatters: TimesheetFormatters;
	split: CalendarEntrySplit;
	/** The API splits in one write, its slots included: tracked time splits on its slot marks. */
	viaApi: boolean;
	onClose: () => void;
	onAddTime: (range: TimeWindow) => void;
}>) {
	const t = useTranslations();
	const timeId = useId();
	const errorId = useId();
	const hintId = useId();
	const reasonId = useId();
	const tasks = useAtomValue(tasksByTeamState);
	const { data: user } = useUserQuery();
	const window: TimeWindow = { start: entry.start, end: entry.end };
	const onSlots = viaApi && splitsOnSlots(entry.log);
	const [clockText, setClockText] = useState(() => clockTextOf(defaultSplitTimeOf(window, onSlots)));
	const [secondTask, setSecondTask] = useState<TTask | null>(null);
	const [reason, setReason] = useState('');
	const entryTitle = useEntryTitle(entry);
	const splitAt = splitTimeFromClock(window, clockText);
	const isTimeInside = splitAt !== null;
	const isOffSlot = onSlots && splitAt !== null && !isSlotMark(splitAt);
	const isTimeValid = isTimeInside && !isOffSlot;
	let parts: ReturnType<typeof splitPartsOf> | null = null;
	if (splitAt && isTimeValid) {
		parts = splitPartsOf(window, splitAt);
	}
	const secondTitle = secondTask?.title ?? entryTitle;
	const shownTaskId = secondTask?.id ?? entry.log.taskId;
	const tenantId = user?.tenantId ?? '';
	const failure = split.failure;
	const isReasonAsked = failure !== null && REASON_FAILURES.has(failure);
	const [showsReason, setShowsReason] = useState(false);
	const hasReasonField = showsReason || isReasonAsked;
	const canSave = isTimeValid && !split.isSaving && Boolean(tenantId);

	const save = async () => {
		if (!splitAt) {
			return;
		}
		if (isReasonAsked) {
			setShowsReason(true);
		}
		const picked = splitTaskOf(secondTask);
		const isSaved = await split.save({ log: entry.log, splitAt, secondTask: picked, tenantId, viaApi, reason });
		if (isSaved) {
			toast.success(t('dashboard.calendar.SPLIT.SAVED'));
			onClose();
		}
	};

	const addRest = () => {
		if (!parts) {
			return;
		}
		onClose();
		onAddTime(parts.second);
	};

	const timeError = useSplitTimeError(window, splitAt, isOffSlot, formatters);
	// After a partial or unconfirmed split of the two writes, trying again could write over what was saved, and after a
	// refusal no second try goes better: the dialog only closes
	const isFinal = failure !== null && FINAL_FAILURES.has(failure);
	// After an unknown outcome the next try must send the same split, which the API never makes twice: the fields keep
	// what was sent (another time would split what the first try may already have cut)
	const isUnsettled = failure !== null && UNSETTLED_FAILURES.has(failure);
	const isLocked = split.isSaving || isFinal || isUnsettled;

	const showsSlotHint = onSlots && !timeError;
	let describedBy: string | undefined;
	if (timeError) {
		describedBy = errorId;
	}
	if (showsSlotHint) {
		describedBy = hintId;
	}
	let timeStep: number | undefined;
	if (onSlots) {
		timeStep = SLOT_MINUTES;
	}
	let closeLabel = t('common.CANCEL');
	if (isFinal) {
		closeLabel = t('common.CLOSE');
	}

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-5">
				<div className="mt-4 flex flex-col">
					<DialogFieldLabel htmlFor={timeId}>{t('dashboard.calendar.SPLIT.TIME_LABEL')}</DialogFieldLabel>
					<TimeField
						id={timeId}
						value={clockText}
						onChange={setClockText}
						step={timeStep}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && canSave) {
								event.preventDefault();
								void save();
							}
						}}
						disabled={isLocked}
						aria-invalid={!isTimeValid}
						aria-describedby={describedBy}
						data-initial-focus=""
						className="w-36"
					/>
					{timeError && (
						<p id={errorId} className="mt-1.5 text-xs text-destructive-ink">
							{timeError}
						</p>
					)}
					{showsSlotHint && (
						<p id={hintId} className="mt-1.5 text-xs text-pretty text-muted-foreground">
							{t('dashboard.calendar.SPLIT.SLOT_STEP')}
						</p>
					)}
				</div>
				{parts && (
					<ul
						aria-label={t('dashboard.calendar.SPLIT.PARTS_LABEL')}
						className="mt-4 divide-y divide-border rounded-xl hairline-ring ring-border"
					>
						<PartRow
							label={t('dashboard.calendar.SPLIT.FIRST_PART')}
							window={parts.first}
							formatters={formatters}
						>
							<span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
								<ProjectDot color={entry.projectColor} projectKey={entry.projectKey} />
								<span className="truncate">{entryTitle}</span>
							</span>
						</PartRow>
						<PartRow
							label={t('dashboard.calendar.SPLIT.SECOND_PART')}
							window={parts.second}
							formatters={formatters}
						>
							<TaskPickerMenu
								tasks={tasks}
								onPick={setSecondTask}
								isSelected={(task) => task.id === shownTaskId}
								searchPlaceholder={t('dashboard.calendar.SPLIT.TASK_SEARCH')}
								triggerLabel={t('dashboard.calendar.SPLIT.TASK_LABEL', { task: secondTitle })}
								triggerClassName={TASK_TRIGGER}
								disabled={isLocked}
							>
								<span className="truncate">{secondTitle}</span>
								<ChevronsUpDown aria-hidden="true" />
							</TaskPickerMenu>
						</PartRow>
					</ul>
				)}
				{hasReasonField && (
					<div className="mt-4 flex flex-col">
						<DialogFieldLabel htmlFor={reasonId}>
							{t('dashboard.calendar.SPLIT.REASON_LABEL')}
						</DialogFieldLabel>
						<Input
							id={reasonId}
							value={reason}
							maxLength={REASON_MAX_LENGTH}
							onChange={(event) => setReason(event.target.value)}
							disabled={isLocked}
						/>
					</div>
				)}
				<SplitFailureNotice failure={failure} parts={parts} formatters={formatters} onAddRest={addRest} />
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" onClick={onClose} disabled={split.isSaving} className="ml-auto">
					{closeLabel}
				</Button>
				{!isFinal && (
					<Button type="button" variant="default" onClick={() => void save()} disabled={!canSave}>
						{split.isSaving && <Spinner aria-hidden="true" className="size-4 animate-spin" />}
						{split.isSaving ? t('dashboard.calendar.SPLIT.SAVING') : t('dashboard.calendar.SPLIT.ACTION')}
					</Button>
				)}
			</div>
		</>
	);
}

function RefusedBody({ refusal, onClose }: Readonly<{ refusal: Exclude<SplitRefusal, 'none'>; onClose: () => void }>) {
	const t = useTranslations();
	return (
		<>
			<div className="px-5 pb-5">
				<p className={cn(NOTICE, 'bg-foreground/[0.03] text-foreground')}>
					<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					<span>{t(REFUSAL_KEYS[refusal])}</span>
				</p>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" onClick={onClose} data-initial-focus="" className="ml-auto">
					{t('common.CLOSE')}
				</Button>
			</div>
		</>
	);
}

function CheckingBody({ onClose }: Readonly<{ onClose: () => void }>) {
	const t = useTranslations();
	return (
		<>
			<div className="px-5 pb-5">
				<output className={cn(NOTICE, 'items-center bg-foreground/[0.03] text-muted-foreground')}>
					<Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin" />
					<span>{t('dashboard.calendar.SPLIT.CHECKING')}</span>
				</output>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" onClick={onClose} data-initial-focus="" className="ml-auto">
					{t('common.CANCEL')}
				</Button>
			</div>
		</>
	);
}

/**
 * The API could not be asked whether it splits (an outage, a lost answer): neither yes nor no, so the dialog neither
 * refuses tracked time nor falls back on the two writes of time added by hand, and offers to ask again.
 */
function CheckFailedBody({ onRecheck, onClose }: Readonly<{ onRecheck: () => void; onClose: () => void }>) {
	const t = useTranslations();
	return (
		<>
			<div className="px-5 pb-5">
				<FailureNotice text={t('dashboard.calendar.SPLIT.CHECK_FAILED')} />
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" onClick={onClose} className="ml-auto">
					{t('common.CANCEL')}
				</Button>
				<Button type="button" variant="default" onClick={onRecheck} data-initial-focus="">
					{t('dashboard.calendar.SPLIT.CHECK_AGAIN')}
				</Button>
			</div>
		</>
	);
}

/**
 * Split, from the Calendar's menu: the split time (the middle of the entry by default, on a slot mark for tracked
 * time), the two parts it makes and the task of the second one. Where the API splits in one write (ever-co/ever-gauzy
 * #12030), tracked time splits too, each slot going with its screenshots and activity to one part. An entry the web
 * cannot split opens on the reason instead of the form, once the API has said whether it splits.
 */
export function CalendarSplitDialog({
	entry,
	isOpen,
	refusal,
	isChecking = false,
	checkFailed = false,
	onRecheck,
	viaApi = false,
	formatters,
	onClose,
	onAddTime
}: Readonly<{
	entry: CalendarEntry | null;
	isOpen: boolean;
	refusal: SplitRefusal;
	/** The API is being asked whether it splits in one write. */
	isChecking?: boolean;
	/** The API could not be asked whether it splits in one write. */
	checkFailed?: boolean;
	/** Asks the API again, after a check that failed. */
	onRecheck?: () => void;
	/** The API splits in one write, its slots included. */
	viaApi?: boolean;
	formatters: TimesheetFormatters;
	onClose: () => void;
	onAddTime: (range: TimeWindow) => void;
}>) {
	const t = useTranslations();
	const title = entry ? <EntrySummary entry={entry} formatters={formatters} /> : null;
	const isAnswerMissing = isChecking || checkFailed;
	const isRefused = refusal !== 'none' && !isAnswerMissing;
	const showsCheckFailed = checkFailed && !isChecking;
	// The writes of a split go on after a close: nothing closes the dialog until they end, so their outcome is seen
	const split = useCalendarEntrySplit();
	const { isSaving, reset } = split;
	const close = () => {
		reset();
		onClose();
	};
	return (
		<AppDialog open={isOpen} onClose={close} width="sm" dismissible={!isSaving}>
			<div className="flex items-start justify-between gap-3 px-5 pt-5">
				<span
					aria-hidden="true"
					className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary-ink hairline-ring ring-primary/20 [&_svg]:size-4.5"
				>
					<Scissors />
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={close}
					disabled={isSaving}
					aria-label={t('common.CLOSE')}
					className="-mt-1 -mr-2 text-muted-foreground"
				>
					<X />
				</Button>
			</div>
			<div className="px-5">
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{isRefused ? t('dashboard.calendar.SPLIT.REFUSED_TITLE') : t('dashboard.calendar.SPLIT.TITLE')}
				</DialogTitle>
				<DialogDescription className="mt-1 text-[13px] text-pretty text-muted-foreground">
					{title}
				</DialogDescription>
			</div>
			{entry && isChecking && <CheckingBody onClose={close} />}
			{entry && showsCheckFailed && onRecheck && <CheckFailedBody onRecheck={onRecheck} onClose={close} />}
			{entry && !isAnswerMissing && isRefused && <RefusedBody refusal={refusal} onClose={close} />}
			{entry && !isAnswerMissing && !isRefused && (
				<SplitForm
					key={entry.log.id}
					entry={entry}
					formatters={formatters}
					split={split}
					viaApi={viaApi}
					onClose={close}
					onAddTime={onAddTime}
				/>
			)}
		</AppDialog>
	);
}

function EntrySummary({ entry, formatters }: Readonly<{ entry: CalendarEntry; formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const title = useEntryTitle(entry);
	const rangeText = entryRangeTextOf(entry, formatters, t('dashboard.timesheets.RUNNING'));
	const duration = formatDurationShort(entry.durationSeconds);
	return (
		<span className="tabular-nums">
			{title} · {formatters.dayDate(entry.start)} · {rangeText} · {duration}
		</span>
	);
}
