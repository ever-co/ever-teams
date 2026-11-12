'use client';

import { useCallback, useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import type { DateOrder } from '@/core/lib/utils/time-import-cells';
import {
	rowStatusOf,
	type TimeImportProblem,
	type TimeImportRow,
	type TimeImportRowStatus,
	type TimeImportRun
} from '@/core/lib/utils/time-import-rows';
import {
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_MAX_BYTES,
	TIME_IMPORT_MAX_ROWS,
	type TimeImportFileProblem,
	type TimeImportMissingColumn
} from '@/core/lib/utils/time-import-sheet';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const TIME_IMPORT_MAX_MEGABYTES = TIME_IMPORT_MAX_BYTES / BYTES_PER_MEGABYTE;

/** A file name or a typed cell can be one long word: it wraps inside its line instead of widening the page. */
export const FILE_NAME_TEXT = '[overflow-wrap:anywhere]';

/** What a cell looks like, shown next to the rule that reads it. Format samples, the same in every language. */
export const TIME_IMPORT_EXAMPLES = {
	date: '2026-11-03',
	dayFirst: '03/11/2026',
	monthFirst: '11/03/2026',
	startTime: '09:30',
	startTimeMeridiem: '9:30 AM',
	endTime: '17:45',
	endTimeMeridiem: '5:45 PM',
	duration: '1:30',
	durationUnits: '1h 30m',
	durationDecimal: '1.5',
	yes: 'yes',
	no: 'no'
} as const;

const DATE_UNREADABLE_KEYS: Readonly<Record<DateOrder, DottedLanguageObjectStringPaths>> = {
	yearFirst: 'timeImport.problems.DATE_UNREADABLE',
	dayFirst: 'timeImport.mapping.problems.DATE_UNREADABLE_DAY_FIRST',
	monthFirst: 'timeImport.mapping.problems.DATE_UNREADABLE_MONTH_FIRST'
};

const STATUS_KEYS: Readonly<Record<TimeImportRowStatus, DottedLanguageObjectStringPaths>> = {
	ready: 'timeImport.status.READY',
	leftOut: 'timeImport.status.LEFT_OUT',
	saved: 'timeImport.status.SAVED',
	failed: 'timeImport.status.FAILED',
	notSent: 'timeImport.status.NOT_SENT'
};

export function useTimeImportCopy() {
	const t = useTranslations();
	const locale = useLocale();
	const rangeFormatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
		[locale]
	);
	const listFormatter = useMemo(() => new Intl.ListFormat(locale, { type: 'conjunction' }), [locale]);

	const rangeOf = useCallback((start: Date, end: Date) => rangeFormatter.formatRange(start, end), [rangeFormatter]);

	const listOf = useCallback((items: ReadonlyArray<string>) => listFormatter.format(items), [listFormatter]);

	const missingColumnOf = useCallback(
		(column: TimeImportMissingColumn): string => {
			if (column === 'endOrDuration') {
				return t('timeImport.fileProblems.END_OR_DURATION', {
					endTime: TIME_IMPORT_HEADERS.endTime,
					duration: TIME_IMPORT_HEADERS.duration
				});
			}
			return TIME_IMPORT_HEADERS[column];
		},
		[t]
	);

	const fileProblemText = useCallback(
		(problem: TimeImportFileProblem): string => {
			switch (problem.code) {
				case 'notCsv':
					return t('timeImport.fileProblems.NOT_CSV');
				case 'tooLarge':
					return t('timeImport.fileProblems.TOO_LARGE', { megabytes: TIME_IMPORT_MAX_MEGABYTES });
				case 'notText':
					return t('timeImport.fileProblems.NOT_TEXT');
				case 'empty':
					return t('timeImport.fileProblems.EMPTY');
				case 'unclosedQuote':
					return t('timeImport.fileProblems.UNCLOSED_QUOTE', { row: problem.row });
				case 'duplicateColumn':
					return t('timeImport.fileProblems.DUPLICATE_COLUMN', { column: problem.header });
				case 'missingColumns': {
					const columns = problem.columns.map(missingColumnOf);
					return t('timeImport.fileProblems.MISSING_COLUMNS', {
						count: columns.length,
						columns: listOf(columns)
					});
				}
				case 'noRows':
					return t('timeImport.fileProblems.NO_ROWS');
				case 'tooManyRows':
					return t('timeImport.fileProblems.TOO_MANY_ROWS', {
						count: problem.count,
						limit: TIME_IMPORT_MAX_ROWS
					});
			}
		},
		[listOf, missingColumnOf, t]
	);

	const problemText = useCallback(
		(problem: TimeImportProblem): string => {
			switch (problem.code) {
				case 'extraCells':
					return t('timeImport.problems.EXTRA_CELLS');
				case 'dateUnreadable':
					return t(DATE_UNREADABLE_KEYS[problem.order], TIME_IMPORT_EXAMPLES);
				case 'startUnreadable':
					return t('timeImport.problems.START_UNREADABLE', TIME_IMPORT_EXAMPLES);
				case 'startDayMismatch':
					return t('timeImport.mapping.problems.START_DAY_MISMATCH');
				case 'endMissing':
					return t('timeImport.problems.END_MISSING');
				case 'endUnreadable':
					return t('timeImport.problems.END_UNREADABLE', TIME_IMPORT_EXAMPLES);
				case 'endDateUnreadable':
					return t('timeImport.mapping.problems.END_DATE_UNREADABLE');
				case 'endDayMismatch':
					return t('timeImport.mapping.problems.END_DAY_MISMATCH');
				case 'durationUnreadable':
					return t('timeImport.problems.DURATION_UNREADABLE', TIME_IMPORT_EXAMPLES);
				case 'endNotAfterStart':
					return t('timeImport.problems.END_NOT_AFTER_START');
				case 'durationMismatch':
					return t('timeImport.problems.DURATION_MISMATCH');
				case 'tooLong':
					return t('timeImport.problems.TOO_LONG');
				case 'inFuture':
					return t('timeImport.problems.IN_FUTURE');
				case 'billableUnreadable':
					return t('timeImport.problems.BILLABLE_UNREADABLE', TIME_IMPORT_EXAMPLES);
				case 'memberUnknown':
					return t('timeImport.problems.MEMBER_UNKNOWN');
				case 'memberNotAllowed':
					return t('timeImport.problems.MEMBER_NOT_ALLOWED');
				case 'noOwnMember':
					return t('timeImport.problems.NO_OWN_MEMBER');
				case 'projectUnknown':
					return t('timeImport.problems.PROJECT_UNKNOWN');
				case 'projectAmbiguous':
					return t('timeImport.problems.PROJECT_AMBIGUOUS', { count: problem.count });
				case 'projectRequired':
					return t('timeImport.problems.PROJECT_REQUIRED');
				case 'taskUnknown':
					return t('timeImport.problems.TASK_UNKNOWN');
				case 'taskNotAssigned':
					return t('timeImport.problems.TASK_NOT_ASSIGNED');
				case 'taskAmbiguous':
					return t('timeImport.problems.TASK_AMBIGUOUS', { count: problem.count });
				case 'alreadyRecorded':
					return t('timeImport.problems.ALREADY_RECORDED');
				case 'overlapsRecorded':
					return t('timeImport.problems.OVERLAPS_RECORDED', {
						count: problem.count,
						range: rangeOf(problem.start, problem.end)
					});
				case 'sameAsRow':
					return t('timeImport.problems.SAME_AS_ROW', { row: problem.row });
				case 'overlapsRow':
					return t('timeImport.problems.OVERLAPS_ROW', { row: problem.row });
			}
		},
		[rangeOf, t]
	);

	const statusLabel = useCallback((status: TimeImportRowStatus): string => t(STATUS_KEYS[status]), [t]);

	/** Why a row was not saved, one sentence per reason; nothing for a row that is ready or saved. */
	const reasonsOf = useCallback(
		(row: TimeImportRow, run: TimeImportRun | null, refusedRow: number | null): string[] => {
			const status = rowStatusOf(row, run);
			if (status === 'leftOut') {
				return row.problems.map(problemText);
			}
			const outcome = run?.outcomes.get(row.row);
			if (outcome?.kind === 'failed') {
				return [t(outcome.reasonKey as DottedLanguageObjectStringPaths)];
			}
			const isHeldBack = status === 'notSent' && refusedRow !== null;
			if (isHeldBack) {
				return [t('timeImport.row.NOT_SENT_REASON', { row: refusedRow })];
			}
			return [];
		},
		[problemText, t]
	);

	return useMemo(
		() => ({ rangeOf, listOf, fileProblemText, problemText, statusLabel, reasonsOf }),
		[fileProblemText, listOf, problemText, rangeOf, reasonsOf, statusLabel]
	);
}

export type TimeImportCopy = ReturnType<typeof useTimeImportCopy>;
