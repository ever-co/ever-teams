'use client';

import { type ReactNode, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronsUpDown, CircleAlert, Info, Plus, Scissors, Spinner, X } from '@/core/components/icons';
import { TaskPickerMenu } from '@/core/components/tasks/detail/task-picker-menu';
import {
	type CalendarEntrySplit,
	type SplitTask,
	useCalendarEntrySplit
} from '@/core/hooks/calendar/use-calendar-entry-split';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { cn } from '@/core/lib/helpers';
import {
	clockTextOf,
	defaultSplitTimeOf,
	type SplitRefusal,
	splitPartsOf,
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

const REFUSAL_KEYS: Record<Exclude<SplitRefusal, 'none'>, DottedLanguageObjectStringPaths> = {
	tracked: 'dashboard.calendar.SPLIT.REFUSED.TRACKED',
	running: 'dashboard.calendar.SPLIT.REFUSED.RUNNING',
	'too-short': 'dashboard.calendar.SPLIT.REFUSED.TOO_SHORT',
	approved: 'dashboard.calendar.SPLIT.REFUSED.APPROVED',
	permission: 'dashboard.calendar.SPLIT.REFUSED.PERMISSION'
};

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

function SplitForm({
	entry,
	formatters,
	split,
	onClose,
	onAddTime
}: Readonly<{
	entry: CalendarEntry;
	formatters: TimesheetFormatters;
	split: CalendarEntrySplit;
	onClose: () => void;
	onAddTime: (range: TimeWindow) => void;
}>) {
	const t = useTranslations();
	const timeId = useId();
	const errorId = useId();
	const tasks = useAtomValue(tasksByTeamState);
	const { data: user } = useUserQuery();
	const window: TimeWindow = { start: entry.start, end: entry.end };
	const [clockText, setClockText] = useState(() => clockTextOf(defaultSplitTimeOf(window)));
	const [secondTask, setSecondTask] = useState<TTask | null>(null);
	const entryTitle = useEntryTitle(entry);
	const splitAt = splitTimeFromClock(window, clockText);
	const isTimeInside = splitAt !== null;
	const parts = splitAt ? splitPartsOf(window, splitAt) : null;
	const secondTitle = secondTask?.title ?? entryTitle;
	const shownTaskId = secondTask?.id ?? entry.log.taskId;
	const tenantId = user?.tenantId ?? '';
	const canSave = isTimeInside && !split.isSaving && Boolean(tenantId);

	const save = async () => {
		if (!splitAt) {
			return;
		}
		let picked: SplitTask | null = null;
		if (secondTask) {
			picked = { id: secondTask.id, projectId: secondTask.projectId ?? null };
		}
		const isSaved = await split.save({ log: entry.log, splitAt, secondTask: picked, tenantId });
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

	let failure: ReactNode = null;
	if (split.failure === 'overlap') {
		failure = <FailureNotice text={t('dashboard.calendar.DRAG.OVERLAP')} />;
	}
	if (split.failure === 'changed') {
		failure = <FailureNotice text={t('dashboard.calendar.SPLIT.FAILED_CHANGED')} />;
	}
	if (split.failure === 'unknown') {
		failure = <FailureNotice text={t('dashboard.calendar.SPLIT.FAILED_UNKNOWN')} />;
	}
	if (split.failure === 'restored') {
		failure = <FailureNotice text={t('dashboard.calendar.SPLIT.FAILED_RESTORED')} />;
	}
	if (split.failure === 'first-part-kept' && parts) {
		const range = windowTextOf(parts.second, formatters);
		failure = (
			<FailureNotice
				text={t('dashboard.calendar.SPLIT.FAILED_FIRST_PART_KEPT', { range })}
				actionLabel={t('dashboard.calendar.SPLIT.ADD_REST')}
				onAction={addRest}
			/>
		);
	}
	// After a partial or unconfirmed split, trying again could write over what was saved: the dialog only closes
	const isRestLeft = split.failure === 'first-part-kept' || split.failure === 'unknown';

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-5">
				<div className="mt-4 flex flex-col">
					<DialogFieldLabel htmlFor={timeId}>{t('dashboard.calendar.SPLIT.TIME_LABEL')}</DialogFieldLabel>
					<Input
						id={timeId}
						type="time"
						value={clockText}
						onChange={(event) => setClockText(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && canSave) {
								event.preventDefault();
								void save();
							}
						}}
						disabled={split.isSaving || isRestLeft}
						aria-invalid={!isTimeInside}
						aria-describedby={isTimeInside ? undefined : errorId}
						data-initial-focus=""
						className="w-32 tabular-nums"
					/>
					{!isTimeInside && (
						<p id={errorId} className="mt-1.5 text-xs text-destructive-ink">
							{t('dashboard.calendar.SPLIT.TIME_OUTSIDE')}
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
								disabled={split.isSaving || isRestLeft}
							>
								<span className="truncate">{secondTitle}</span>
								<ChevronsUpDown aria-hidden="true" />
							</TaskPickerMenu>
						</PartRow>
					</ul>
				)}
				{failure}
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" onClick={onClose} disabled={split.isSaving} className="ml-auto">
					{isRestLeft ? t('common.CLOSE') : t('common.CANCEL')}
				</Button>
				{!isRestLeft && (
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

/**
 * Split, from the Calendar's menu: the split time (the middle of the entry by default), the two parts it makes and
 * the task of the second one. An entry the web cannot split opens on the reason instead of the form.
 */
export function CalendarSplitDialog({
	entry,
	isOpen,
	refusal,
	formatters,
	onClose,
	onAddTime
}: Readonly<{
	entry: CalendarEntry | null;
	isOpen: boolean;
	refusal: SplitRefusal;
	formatters: TimesheetFormatters;
	onClose: () => void;
	onAddTime: (range: TimeWindow) => void;
}>) {
	const t = useTranslations();
	const title = entry ? <EntrySummary entry={entry} formatters={formatters} /> : null;
	const isRefused = refusal !== 'none';
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
			{entry && isRefused && <RefusedBody refusal={refusal} onClose={close} />}
			{entry && !isRefused && (
				<SplitForm
					key={entry.log.id}
					entry={entry}
					formatters={formatters}
					split={split}
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
