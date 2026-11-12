'use client';

import { useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { MetricStrip, type MetricItem, type MetricTone } from '@/core/components/dashboards/kit/metric-strip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, Spinner, Table } from '@/core/components/icons';
import { SettingsReadOnlyNote, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import type { TimeImport } from '@/core/hooks/timesheet/use-time-import';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { rowStatusOf, type TimeImportReport, type TimeImportRowStatus } from '@/core/lib/utils/time-import-rows';
import { FILE_NAME_TEXT, type TimeImportCopy } from './time-import-copy';
import { TimeImportRowItem } from './time-import-row';

const ROWS_SHOWN_PER_STEP = 50;

const ALL_ROWS = 'all';

type RowFilter = typeof ALL_ROWS | TimeImportRowStatus;

const STATUS_ORDER: ReadonlyArray<TimeImportRowStatus> = ['ready', 'saved', 'failed', 'notSent', 'leftOut'];

const FIGURE_KEYS: Readonly<Record<TimeImportRowStatus, DottedLanguageObjectStringPaths>> = {
	ready: 'timeImport.figures.READY',
	leftOut: 'timeImport.figures.LEFT_OUT',
	saved: 'timeImport.figures.SAVED',
	failed: 'timeImport.figures.FAILED',
	notSent: 'timeImport.figures.NOT_SENT'
};

/** A figure takes its tone only when there is something to report: a zero stays plain. */
function toneWhenCounted(count: number, tone: MetricTone): MetricTone {
	if (count > 0) {
		return tone;
	}
	return 'default';
}

function percentOf(done: number, total: number): number {
	if (total === 0) {
		return 0;
	}
	return Math.round((done / total) * 100);
}

function SaveProgress({ done, total }: Readonly<{ done: number; total: number }>) {
	const t = useTranslations();
	const label = t('timeImport.IMPORTING_PROGRESS', { done, total });
	const percent = percentOf(done, total);
	const barStyle = { width: `${percent}%` };
	return (
		<div className="flex flex-col gap-2 px-4 py-3">
			<p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] font-medium tabular-nums text-foreground">
				{label}
				<span className="text-xs font-normal text-muted-foreground">{t('timeImport.KEEP_OPEN')}</span>
			</p>
			<div
				role="progressbar"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={total}
				aria-valuenow={done}
				className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]"
			>
				<div className="h-full rounded-full bg-primary transition-[width] duration-200" style={barStyle} />
			</div>
		</div>
	);
}

function RunNotice({ report }: Readonly<{ report: TimeImportReport }>) {
	const t = useTranslations();
	const { refusal } = report;
	if (!refusal) {
		return (
			<Notice
				tone="success"
				title={t('timeImport.DONE_TITLE', { count: report.savedCount })}
				description={t('timeImport.DONE_DESCRIPTION', { duration: formatDurationShort(report.savedSeconds) })}
			/>
		);
	}
	const sentences = [
		t(refusal.reasonKey as DottedLanguageObjectStringPaths),
		t('timeImport.STOPPED_SAVED', { count: report.savedCount })
	];
	if (report.notSentCount > 0) {
		sentences.push(t('timeImport.STOPPED_NOT_SENT', { count: report.notSentCount }));
	}
	return (
		<Notice
			tone="error"
			title={t('timeImport.STOPPED_TITLE', { row: refusal.row })}
			description={sentences.join(' ')}
		/>
	);
}

interface TimeImportResultProps {
	timeImport: TimeImport;
	copy: TimeImportCopy;
	onDownloadReport: () => void;
}

/**
 * The rows of a checked file, each with what becomes of it. The same list is the preview before the import, its
 * progress while the rows are saved, and its report afterwards.
 */
export function TimeImportResult({ timeImport, copy, onDownloadReport }: Readonly<TimeImportResultProps>) {
	const t = useTranslations();
	const { stage, fileName, rows, summary, run, report, ignoredHeaders } = timeImport;
	const [filter, setFilter] = useState<RowFilter>(ALL_ROWS);
	const [visibleCount, setVisibleCount] = useState(ROWS_SHOWN_PER_STEP);

	const isPreview = stage === 'preview';
	const isRechecking = stage === 'rechecking';
	const isImporting = stage === 'importing';
	const isDone = stage === 'done';
	const refusedRow = report?.refusal?.row ?? null;

	const statusedRows = useMemo(() => rows.map((row) => ({ row, status: rowStatusOf(row, run) })), [rows, run]);

	const filterItems = useMemo(() => {
		const items: SegmentedControlItem<RowFilter>[] = [
			{ value: ALL_ROWS, label: t('timeImport.filter.ALL'), count: statusedRows.length }
		];
		for (const status of STATUS_ORDER) {
			const count = statusedRows.filter((item) => item.status === status).length;
			if (count > 0) {
				items.push({ value: status, label: t(FIGURE_KEYS[status]), count });
			}
		}
		return items;
	}, [statusedRows, t]);

	// A status every row has left (a ready row once saved) falls back to the whole list
	const isFilterStillOffered = filterItems.some((item) => item.value === filter);
	let activeFilter: RowFilter = ALL_ROWS;
	if (isFilterStillOffered) {
		activeFilter = filter;
	}
	const filteredRows = statusedRows.filter((item) => activeFilter === ALL_ROWS || item.status === activeFilter);
	const shownRows = filteredRows.slice(0, visibleCount);
	const hiddenCount = filteredRows.length - shownRows.length;
	const nextStepCount = Math.min(hiddenCount, ROWS_SHOWN_PER_STEP);

	const changeFilter = (next: RowFilter) => {
		setFilter(next);
		setVisibleCount(ROWS_SHOWN_PER_STEP);
	};

	let title = t('timeImport.PREVIEW_TITLE');
	let description: string = t('timeImport.PREVIEW_DESCRIPTION', { fileName, count: summary.rowCount });
	if (isRechecking || isImporting) {
		title = t('timeImport.IMPORTING_TITLE');
		description = fileName;
	}
	if (isDone) {
		title = t('timeImport.REPORT_TITLE');
		description = fileName;
	}

	const leftOutTone = toneWhenCounted(summary.leftOutCount, 'warning');
	let figures: MetricItem<string>[] = [
		{ key: 'ready', label: t('timeImport.figures.READY'), value: summary.readyCount },
		{ key: 'leftOut', label: t('timeImport.figures.LEFT_OUT'), value: summary.leftOutCount, tone: leftOutTone },
		{
			key: 'time',
			label: t('timeImport.figures.TIME_TO_ADD'),
			value: formatDurationShort(summary.readySeconds)
		}
	];
	if (report) {
		const failedTone = toneWhenCounted(report.failedCount, 'destructive');
		figures = [
			{ key: 'saved', label: t('timeImport.figures.SAVED'), value: report.savedCount, tone: 'success' },
			{ key: 'leftOut', label: t('timeImport.figures.LEFT_OUT'), value: report.leftOutCount, tone: leftOutTone },
			{ key: 'failed', label: t('timeImport.figures.FAILED'), value: report.failedCount, tone: failedTone },
			{ key: 'notSent', label: t('timeImport.figures.NOT_SENT'), value: report.notSentCount },
			{
				key: 'time',
				label: t('timeImport.figures.TIME_ADDED'),
				value: formatDurationShort(report.savedSeconds)
			}
		];
	}

	const hasReadyRows = summary.readyCount > 0;
	const showsFilter = isPreview || isDone;
	const showsIgnoredHeaders = isPreview && ignoredHeaders.length > 0;
	const offersColumns = isPreview && timeImport.canEditColumns;

	return (
		<SettingsSection
			id="time-import"
			title={title}
			description={<span className={FILE_NAME_TEXT}>{description}</span>}
			actions={
				offersColumns && (
					<Button type="button" variant="ghost" size="sm" onClick={timeImport.editColumns}>
						<Table aria-hidden="true" />
						{t('timeImport.mapping.EDIT')}
					</Button>
				)
			}
		>
			{isPreview && timeImport.hasPreviewChanged && (
				<Notice
					tone="warning"
					title={t('timeImport.PREVIEW_CHANGED_TITLE')}
					description={t('timeImport.PREVIEW_CHANGED_DESCRIPTION')}
				/>
			)}
			{isPreview && timeImport.hasCheckFailed && (
				<Notice
					tone="error"
					title={t('timeImport.RECHECK_FAILED_TITLE')}
					description={t('timeImport.RECHECK_FAILED_DESCRIPTION')}
				/>
			)}
			{isDone && report && <RunNotice report={report} />}
			<SettingsSurface>
				<MetricStrip items={figures} ariaLabel={t('timeImport.figures.LABEL')} />
				{isPreview && (
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
						{!hasReadyRows && (
							<p
								role="status"
								className="min-w-0 flex-1 basis-56 text-xs text-pretty text-muted-foreground"
							>
								{t('timeImport.NOTHING_READY')}
							</p>
						)}
						<div className="ml-auto flex flex-wrap items-center gap-2">
							<Button type="button" variant="outline" onClick={timeImport.reset}>
								{t('timeImport.CHOOSE_ANOTHER')}
							</Button>
							{hasReadyRows && (
								<Button type="button" onClick={() => void timeImport.confirm()}>
									{t('timeImport.IMPORT_ACTION', { count: summary.readyCount })}
								</Button>
							)}
						</div>
					</div>
				)}
				{isRechecking && (
					<output aria-busy="true" className="flex items-center gap-2 px-4 py-3 text-[13px] text-foreground">
						<Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
						{t('timeImport.RECHECKING')}
					</output>
				)}
				{isImporting && report && <SaveProgress done={report.savedCount} total={summary.readyCount} />}
				{isDone && (
					<div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
						<Button type="button" variant="outline" onClick={onDownloadReport}>
							<Download aria-hidden="true" />
							{t('timeImport.DOWNLOAD_REPORT')}
						</Button>
						<Button type="button" onClick={timeImport.reset}>
							{t('timeImport.IMPORT_ANOTHER')}
						</Button>
					</div>
				)}
				<div className="flex flex-col">
					{showsFilter && (
						<div className="max-w-full overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
							<SegmentedControl
								items={filterItems}
								value={activeFilter}
								onValueChange={changeFilter}
								ariaLabel={t('timeImport.filter.LABEL')}
							/>
						</div>
					)}
					<ul className="flex flex-col hairline-divide-y divide-border">
						{shownRows.map(({ row, status }) => (
							<TimeImportRowItem
								key={row.row}
								row={row}
								status={status}
								reasons={copy.reasonsOf(row, run, refusedRow)}
								copy={copy}
							/>
						))}
					</ul>
				</div>
				{hiddenCount > 0 && (
					<div className="px-2 py-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
							onClick={() => setVisibleCount((current) => current + ROWS_SHOWN_PER_STEP)}
						>
							{t('timeImport.SHOW_MORE', { count: nextStepCount })}
						</Button>
					</div>
				)}
			</SettingsSurface>
			{showsIgnoredHeaders && (
				<SettingsReadOnlyNote>
					{t('timeImport.IGNORED_COLUMNS', {
						count: ignoredHeaders.length,
						columns: copy.listOf(ignoredHeaders)
					})}
				</SettingsReadOnlyNote>
			)}
		</SettingsSection>
	);
}
