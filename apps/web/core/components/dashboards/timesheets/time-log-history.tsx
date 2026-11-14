'use client';

import type { ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Pencil, Plus, Trash } from '@/core/components/icons';
import type { HistoryState } from '@/core/hooks/dashboards/timesheets/use-time-log-history';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import {
	type HistoryFieldChange,
	headlineFieldOf,
	type HistoryValueFormat,
	historyValueTextOf,
	type TimeLogHistoryAction,
	type TimeLogHistoryChange,
	type TimeLogHistoryField
} from '@/core/lib/utils/time-log-history';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { STATUS_LABEL_KEYS } from './timesheet-status';

type Translate = ReturnType<typeof useTranslations>;

/** Finds a member's name by their employee id, `null` when the page does not know them. */
export type MemberNameOf = (employeeId: string) => string | null;

/** The column names of the pages, so a change reads with the words the tables already use. */
export const HISTORY_FIELD_LABEL_KEYS: Record<TimeLogHistoryField, DottedLanguageObjectStringPaths> = {
	startedAt: 'dashboard.timesheets.COLUMNS.START',
	stoppedAt: 'dashboard.timesheets.COLUMNS.END',
	duration: 'dashboard.timesheets.COLUMNS.DURATION',
	taskId: 'dashboard.timesheets.COLUMNS.TASK',
	projectId: 'dashboard.timesheets.COLUMNS.PROJECT',
	organizationContactId: 'common.CLIENT',
	organizationTeamId: 'common.TEAM',
	employeeId: 'common.MEMBER',
	isBillable: 'dashboard.timesheets.COLUMNS.BILLABLE',
	description: 'common.NOTES',
	status: 'dashboard.timesheets.COLUMNS.STATUS'
};

const ACTION_KEYS: Record<
	TimeLogHistoryAction,
	{ byName: DottedLanguageObjectStringPaths; alone: DottedLanguageObjectStringPaths }
> = {
	created: { byName: 'dashboard.timesheets.HISTORY.ADDED_BY', alone: 'dashboard.timesheets.CHANGE.ADDED' },
	updated: { byName: 'dashboard.timesheets.HISTORY.EDITED_BY', alone: 'dashboard.timesheets.CHANGE.EDITED' },
	deleted: { byName: 'dashboard.timesheets.HISTORY.DELETED_BY', alone: 'dashboard.timesheets.HISTORY.DELETED' }
};

const ACTION_TONES: Record<TimeLogHistoryAction, string> = {
	created: 'text-primary-ink',
	updated: 'text-warning-foreground',
	deleted: 'text-destructive-ink'
};

const VALUE_TEXT = 'line-clamp-3 whitespace-pre-line [overflow-wrap:anywhere]';

function isTimesheetStatus(value: string): value is ETimesheetStatus {
	return (Object.values(ETimesheetStatus) as string[]).includes(value);
}

function statusLabelOf(status: string, t: Translate) {
	if (isTimesheetStatus(status)) {
		return t(STATUS_LABEL_KEYS[status]);
	}
	return status;
}

/** The words and clocks a page writes the values of a change with. */
export function historyValueFormatOf(
	t: Translate,
	time: (date: Date) => string,
	memberNameOf: MemberNameOf
): HistoryValueFormat {
	return {
		time,
		duration: formatDurationShort,
		yes: t('common.YES'),
		no: t('common.NO'),
		none: t('dashboard.timesheets.HISTORY.NONE'),
		statusLabel: (status) => statusLabelOf(status, t),
		memberName: memberNameOf
	};
}

function dayKeyOf(value: HistoryFieldChange['before']) {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date.toDateString();
}

/** A start or an end moved to another day says the day too: "Nov 9, 09:00 -> Nov 10, 09:00". */
function clockOfField(field: HistoryFieldChange, formatters: TimesheetFormatters) {
	const beforeDay = dayKeyOf(field.before);
	const afterDay = dayKeyOf(field.after);
	const hasBoth = beforeDay !== null && afterDay !== null;
	const movesDay = hasBoth && beforeDay !== afterDay;
	if (!movesDay) {
		return formatters.time;
	}
	return (date: Date) => `${formatters.dayDate(date)}, ${formatters.time(date)}`;
}

/** The label of a field and its values before and after, written the way the page writes them. */
function fieldTextsOf(field: HistoryFieldChange, format: HistoryValueFormat, formatters: TimesheetFormatters) {
	const fieldFormat = { ...format, time: clockOfField(field, formatters) };
	const before = historyValueTextOf(field.field, field.before, field.beforeName, fieldFormat);
	const after = historyValueTextOf(field.field, field.after, field.afterName, fieldFormat);
	return { before, after };
}

function FieldLine({
	field,
	action,
	format,
	formatters
}: Readonly<{
	field: HistoryFieldChange;
	action: TimeLogHistoryAction;
	format: HistoryValueFormat;
	formatters: TimesheetFormatters;
}>) {
	const t = useTranslations();
	const label = t(HISTORY_FIELD_LABEL_KEYS[field.field]);
	const { before, after } = fieldTextsOf(field, format, formatters);
	const isUpdate = action === 'updated';
	const isDeletion = action === 'deleted';
	let value = (
		<span title={after} className={cn(VALUE_TEXT, 'text-foreground')}>
			{after}
		</span>
	);
	if (isDeletion) {
		value = (
			<span title={before} className={cn(VALUE_TEXT, 'text-muted-foreground')}>
				{before}
			</span>
		);
	}
	if (isUpdate) {
		value = (
			<>
				<span className="sr-only">{t('dashboard.timesheets.HISTORY.FIELD_CHANGED', { before, after })}</span>
				<span aria-hidden="true" className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
					<span title={before} className={cn(VALUE_TEXT, 'text-muted-foreground')}>
						{before}
					</span>
					<span className="text-muted-foreground">→</span>
					<span title={after} className={cn(VALUE_TEXT, 'font-medium text-foreground')}>
						{after}
					</span>
				</span>
			</>
		);
	}
	return (
		<li className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 tabular-nums">
			<span className="truncate text-muted-foreground">{label}</span>
			<span className="min-w-0">{value}</span>
		</li>
	);
}

/** The duration first, as the report reads an edit ("2h 00m -> 5h 00m"), then the other fields in reading order. */
function summaryFieldsOf(change: TimeLogHistoryChange) {
	const headline = headlineFieldOf(change);
	if (!headline) {
		return [];
	}
	const others = change.fields.filter((field) => field.field !== headline.field);
	return [headline, ...others];
}

/** One change on one line, each field "End 11:00 -> 14:00" with the old value muted; wraps on a narrow screen. */
export function ChangeSummaryLine({
	change,
	formatters,
	memberNameOf,
	className
}: Readonly<{
	change: TimeLogHistoryChange;
	formatters: TimesheetFormatters;
	memberNameOf: MemberNameOf;
	className?: string;
}>) {
	const t = useTranslations();
	const format = historyValueFormatOf(t, formatters.time, memberNameOf);
	const fields = summaryFieldsOf(change);
	return (
		<span className={cn('flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5', className)}>
			{fields.map((field) => {
				const label = t(HISTORY_FIELD_LABEL_KEYS[field.field]);
				const { before, after } = fieldTextsOf(field, format, formatters);
				return (
					<span key={field.field} className="inline-flex min-w-0 max-w-full items-baseline gap-1">
						<span className="shrink-0">{label}</span>
						<span className="sr-only">
							{t('dashboard.timesheets.HISTORY.FIELD_CHANGED', { before, after })}
						</span>
						<span aria-hidden="true" title={before} className="min-w-0 truncate">
							{before}
						</span>
						<span aria-hidden="true">→</span>
						<span aria-hidden="true" title={after} className="min-w-0 truncate font-medium text-foreground">
							{after}
						</span>
					</span>
				);
			})}
		</span>
	);
}

function ActionGlyph({ action }: Readonly<{ action: TimeLogHistoryAction }>) {
	const className = cn('size-3.5 shrink-0', ACTION_TONES[action]);
	if (action === 'created') {
		return <Plus aria-hidden="true" className={className} />;
	}
	if (action === 'deleted') {
		return <Trash aria-hidden="true" className={className} />;
	}
	return <Pencil aria-hidden="true" className={className} />;
}

function headlineOf(change: TimeLogHistoryChange, memberNameOf: MemberNameOf, t: Translate) {
	const keys = ACTION_KEYS[change.action];
	const authorId = change.authorEmployeeId;
	let authorName: string | null = null;
	if (authorId) {
		authorName = memberNameOf(authorId);
	}
	if (authorName) {
		return t(keys.byName, { name: authorName });
	}
	return t(keys.alone);
}

function ChangeItem({
	change,
	format,
	formatters,
	memberNameOf
}: Readonly<{
	change: TimeLogHistoryChange;
	format: HistoryValueFormat;
	formatters: TimesheetFormatters;
	memberNameOf: MemberNameOf;
}>) {
	const t = useTranslations();
	const headline = headlineOf(change, memberNameOf, t);
	const when = t('dashboard.timesheets.HISTORY.WHEN', {
		date: formatters.dayDate(change.at),
		time: formatters.time(change.at)
	});
	const reason = change.reason;
	return (
		<li className="flex min-w-0 flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
			<p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
				<ActionGlyph action={change.action} />
				<span className="font-medium text-foreground">{headline}</span>
				<span aria-hidden="true" className="text-muted-foreground">
					·
				</span>
				<time dateTime={change.at.toISOString()} className="tabular-nums text-muted-foreground">
					{when}
				</time>
			</p>
			{reason && (
				<blockquote
					title={reason}
					className="line-clamp-3 whitespace-pre-line rounded-md bg-foreground/[0.03] px-2 py-1 text-xs leading-5 text-foreground/80 [overflow-wrap:anywhere]"
				>
					<span className="sr-only">{t('dashboard.timesheets.CHANGE.REASON_PREFIX')} </span>
					{reason}
				</blockquote>
			)}
			{change.fields.length > 0 && (
				<ul className="flex min-w-0 flex-col gap-0.5">
					{change.fields.map((field) => (
						<FieldLine
							key={field.field}
							field={field}
							action={change.action}
							format={format}
							formatters={formatters}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

function HistoryNote({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return <p className={cn('text-xs leading-5 text-muted-foreground', className)}>{children}</p>;
}

function HistorySkeleton() {
	const t = useTranslations();
	return (
		<div role="status" className="flex flex-col gap-3">
			<span className="sr-only">{t('dashboard.timesheets.HISTORY.LOADING')}</span>
			{['w-40', 'w-32'].map((width) => (
				<span key={width} aria-hidden="true" className="flex flex-col gap-1.5">
					<span className={cn('h-2.5', width, SKELETON_BAR)} />
					<span className={cn('h-2 w-52', SKELETON_BAR)} />
					<span className={cn('h-2 w-44', SKELETON_BAR)} />
				</span>
			))}
		</div>
	);
}

/**
 * The history of one entry, newest first: each change with who made it, when, the reason, and each field before and
 * after, the old value muted. Every state is said: loading, refused, failed, an API without history, nothing kept.
 */
export function TimeLogHistoryView({
	state,
	formatters,
	memberNameOf,
	onRetry,
	className
}: Readonly<{
	state: HistoryState;
	formatters: TimesheetFormatters;
	memberNameOf: MemberNameOf;
	onRetry: () => void;
	className?: string;
}>) {
	const t = useTranslations();
	if (state.status === 'loading') {
		return (
			<div className={className}>
				<HistorySkeleton />
			</div>
		);
	}
	if (state.status === 'forbidden') {
		return <HistoryNote className={className}>{t('dashboard.timesheets.HISTORY.FORBIDDEN')}</HistoryNote>;
	}
	if (state.status === 'unsupported') {
		return <HistoryNote className={className}>{t('dashboard.timesheets.HISTORY.UNSUPPORTED')}</HistoryNote>;
	}
	if (state.status === 'error') {
		return (
			<div role="alert" className={cn('flex flex-col items-start gap-1.5', className)}>
				<HistoryNote>{t('dashboard.timesheets.HISTORY.ERROR')}</HistoryNote>
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					{t('dashboard.timesheets.HISTORY.RETRY')}
				</Button>
			</div>
		);
	}
	const hasChanges = state.changes.length > 0;
	if (!hasChanges) {
		return <HistoryNote className={className}>{t('dashboard.timesheets.HISTORY.NOT_KEPT')}</HistoryNote>;
	}
	const format = historyValueFormatOf(t, formatters.time, memberNameOf);
	return (
		<ol className={cn('flex min-w-0 flex-col divide-y divide-border', className)}>
			{state.changes.map((change) => (
				<ChangeItem
					key={change.id}
					change={change}
					format={format}
					formatters={formatters}
					memberNameOf={memberNameOf}
				/>
			))}
		</ol>
	);
}
