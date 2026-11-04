'use client';

import { memo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Layers } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	ALL_STATUSES,
	type StatusFigure,
	type StatusSummary,
	TIMESHEET_STATUS_ORDER,
	type TimesheetStatusFilter
} from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { STATUS_LABEL_KEYS, TimesheetStatusGlyph } from './timesheet-status';

const CARD_KEYS: ReadonlyArray<TimesheetStatusFilter> = [ALL_STATUSES, ...TIMESHEET_STATUS_ORDER];

/** Shown while the cards load: the four statuses every period can have, after All. */
const SKELETON_CARD_COUNT = 5;

const MISSING_VALUE = '–';

const CARD =
	'flex min-w-[9.5rem] flex-1 flex-col gap-2.5 rounded-xl bg-card px-3.5 py-3 text-left hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

const INTERACTIVE_CARD =
	'cursor-pointer outline-none transition-[background-color,box-shadow] duration-150 hover:bg-foreground/[0.015] focus-visible:ring-[3px] focus-visible:ring-ring/25';

const PICKED_CARD = 'bg-primary/[0.04] ring-primary/45 shadow-sm shadow-primary/10 hover:bg-primary/[0.05]';

const CARDS_ROW = '-mx-2 flex gap-2 overflow-x-auto px-2 py-1';

function cardLabelKeyOf(status: TimesheetStatusFilter): DottedLanguageObjectStringPaths {
	if (status === ETimesheetStatus.PENDING) {
		return 'dashboard.timesheets.STATUS_CARDS.PENDING';
	}
	return STATUS_LABEL_KEYS[status];
}

/** In review is rare in Teams: its card appears when some logs are in review, or while it is the picked filter. */
function showsCardOf(status: TimesheetStatusFilter, summary: StatusSummary, selected: TimesheetStatusFilter) {
	const isInReview = status === ETimesheetStatus.IN_REVIEW;
	if (!isInReview) {
		return true;
	}
	const hasLogs = summary[status].count > 0;
	const isPicked = selected === status;
	return hasLogs || isPicked;
}

function CardGlyph({ status }: Readonly<{ status: TimesheetStatusFilter }>) {
	if (status === ALL_STATUSES) {
		return <Layers aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
	}
	return <TimesheetStatusGlyph status={status} className="size-4 shrink-0" />;
}

function CardFigures({ figure, isUnavailable }: Readonly<{ figure: StatusFigure; isUnavailable: boolean }>) {
	const t = useTranslations();
	if (isUnavailable) {
		return (
			<span className="flex items-baseline justify-between gap-3">
				<span className="text-lg font-semibold leading-none tabular-nums text-muted-foreground">
					{MISSING_VALUE}
				</span>
				<span className="text-[13px] tabular-nums text-muted-foreground">{MISSING_VALUE}</span>
			</span>
		);
	}
	const unit = t('dashboard.timesheets.STATUS_CARDS.LOG_UNIT', { count: figure.count });
	const hours = formatDurationShort(figure.seconds);
	return (
		<span className="flex items-baseline justify-between gap-3">
			<span className="flex min-w-0 items-baseline gap-1">
				<span className="text-lg font-semibold leading-none tabular-nums text-foreground">{figure.count}</span>
				<span className="truncate text-xs text-muted-foreground">{unit}</span>
			</span>
			<span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{hours}</span>
		</span>
	);
}

const StatusCard = memo(function StatusCard({
	status,
	figure,
	isPicked,
	isUnavailable,
	onSelect
}: Readonly<{
	status: TimesheetStatusFilter;
	figure: StatusFigure;
	isPicked: boolean;
	isUnavailable: boolean;
	onSelect: (status: TimesheetStatusFilter) => void;
}>) {
	const t = useTranslations();
	const label = t(cardLabelKeyOf(status));
	return (
		<button
			type="button"
			aria-pressed={isPicked}
			onClick={() => onSelect(status)}
			className={cn(CARD, INTERACTIVE_CARD, isPicked && PICKED_CARD)}
		>
			<span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
				<CardGlyph status={status} />
				<span className="truncate">{label}</span>
			</span>
			<CardFigures figure={figure} isUnavailable={isUnavailable} />
		</button>
	);
});

function StatusCardSkeleton() {
	return (
		<div aria-hidden="true" className={CARD}>
			<span className="flex items-center gap-1.5">
				<span className="size-4 rounded-full bg-foreground/[0.06]" />
				<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
			</span>
			<span className="flex items-center justify-between gap-3">
				<span className={cn('h-4 w-10', SKELETON_BAR)} />
				<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
			</span>
		</div>
	);
}

/**
 * The figures of the page as one selectable card per timesheet status (All first): the number of logs and their
 * time over the period, after the search and the filters. The picked card filters the sheet, the list and the
 * calendars below; on a phone the row scrolls sideways.
 */
export function TimesheetsStatusCards({
	summary,
	selected,
	onSelect,
	isLoading,
	isUnavailable
}: Readonly<{
	summary: StatusSummary;
	selected: TimesheetStatusFilter;
	onSelect: (status: TimesheetStatusFilter) => void;
	isLoading: boolean;
	/** The logs could not be read: the cards say "–" rather than a zero nobody returned. */
	isUnavailable: boolean;
}>) {
	const t = useTranslations();
	const label = t('dashboard.timesheets.STATUS_STRIP_LABEL');
	if (isLoading) {
		const placeholders = Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index);
		return (
			<div aria-label={label} aria-busy="true" className={CARDS_ROW}>
				{placeholders.map((index) => (
					<StatusCardSkeleton key={index} />
				))}
			</div>
		);
	}
	const shownKeys = CARD_KEYS.filter((status) => showsCardOf(status, summary, selected));
	return (
		<div role="group" aria-label={label} className={CARDS_ROW}>
			{shownKeys.map((status) => (
				<StatusCard
					key={status}
					status={status}
					figure={summary[status]}
					isPicked={status === selected}
					isUnavailable={isUnavailable}
					onSelect={onSelect}
				/>
			))}
		</div>
	);
}
