'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { type CsvColumn, downloadCsv, downloadPdf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { exportRowsOf, formatHoursMinutes, localDateOfKey, rowActivityOf } from '@/core/lib/utils/dashboards/team';
import type { TeamReportPdfInput, TeamReportPdfRow } from './export/team-report-pdf';

const FILE_PREFIX = 'team-report';

type Translate = ReturnType<typeof useTranslations>;

function namedOrFallback(name: string | null | undefined, fallback: string) {
	const trimmed = name?.trim();
	if (trimmed) {
		return trimmed;
	}
	return fallback;
}

function projectNameOf(row: DailyReportRow, t: Translate) {
	return namedOrFallback(row.projectName, t('dashboard.team.projects.NONE'));
}

function memberNameOf(row: DailyReportRow, t: Translate) {
	return namedOrFallback(row.employeeName, t('dashboard.team.UNNAMED_MEMBER'));
}

function roundedActivityOf(row: DailyReportRow) {
	const activity = rowActivityOf(row);
	return Math.round(activity);
}

function scopeTextOf(dashboard: TeamDashboardState, t: Translate) {
	const names: string[] = [];
	for (const team of dashboard.teamOptions) {
		const isPicked = dashboard.filters.teams.includes(team.id ?? '');
		if (isPicked) {
			names.push(team.name ?? '');
		}
	}
	for (const person of dashboard.memberOptions) {
		const isPicked = dashboard.filters.members.includes(person.employeeId);
		if (isPicked) {
			names.push(person.name);
		}
	}
	if (names.length === 0) {
		return t('dashboard.team.export.NO_FILTERS');
	}
	const pickedNames = names.join(', ');
	return t('dashboard.team.export.FILTERS', { names: pickedNames });
}

function csvColumnsOf(t: Translate): CsvColumn<DailyReportRow>[] {
	return [
		{ header: t('dashboard.team.export.DATE'), valueOf: (row) => row.dateKey },
		{ header: t('dashboard.team.table.MEMBER'), valueOf: (row) => memberNameOf(row, t) },
		{ header: t('dashboard.team.export.PROJECT'), valueOf: (row) => projectNameOf(row, t) },
		{ header: t('dashboard.team.export.TRACKED_HOURS'), valueOf: (row) => formatHoursMinutes(row.seconds) },
		{ header: t('dashboard.team.export.ACTIVITY_PERCENT'), valueOf: roundedActivityOf }
	];
}

function pdfRowsOf(rows: ReadonlyArray<DailyReportRow>, dateFormat: Intl.DateTimeFormat, t: Translate) {
	return rows.map<TeamReportPdfRow>((row) => {
		const date = localDateOfKey(row.dateKey);
		const activity = rowActivityOf(row);
		return {
			key: row.key,
			date: dateFormat.format(date),
			member: memberNameOf(row, t),
			project: projectNameOf(row, t),
			tracked: formatDurationShort(row.seconds),
			activity: formatPercent(activity)
		};
	});
}

function pdfInputOf(dashboard: TeamDashboardState, locale: string, t: Translate): TeamReportPdfInput {
	const { totals } = dashboard;
	const numberFormat = new Intl.NumberFormat(locale);
	const dateFormat = new Intl.DateTimeFormat(locale, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const generatedFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const rows = exportRowsOf(dashboard.rows);
	const trackedText = formatDurationShort(totals.seconds);
	const activityText = formatPercent(totals.activity);
	const generatedDate = generatedFormat.format(new Date());
	return {
		title: t('dashboard.team.export.TITLE'),
		periodText: formatPeriod(dashboard.period, locale),
		scopeText: scopeTextOf(dashboard, t),
		generatedText: t('dashboard.team.export.GENERATED', { date: generatedDate }),
		figures: [
			{ label: t('dashboard.team.table.TRACKED'), value: trackedText },
			{ label: t('dashboard.team.table.ACTIVITY'), value: activityText },
			{ label: t('dashboard.team.table.MEMBERS'), value: numberFormat.format(totals.memberCount) },
			{ label: t('dashboard.team.table.PROJECTS'), value: numberFormat.format(totals.projectCount) }
		],
		columns: {
			date: t('dashboard.team.export.DATE'),
			member: t('dashboard.team.table.MEMBER'),
			project: t('dashboard.team.export.PROJECT'),
			tracked: t('dashboard.team.table.TRACKED'),
			activity: t('dashboard.team.table.ACTIVITY')
		},
		rows: pdfRowsOf(rows, dateFormat, t),
		totalLabel: t('dashboard.team.export.TOTAL'),
		totalTracked: trackedText,
		totalActivity: activityText
	};
}

/**
 * The two files of the team report, built on the click from the rows already on screen: a CSV with one line per day,
 * member and project, and a PDF of the same lines. The PDF renderer and its document load only then.
 */
export function useTeamExportOptions(dashboard: TeamDashboardState): ExportOption[] {
	const t = useTranslations();
	const locale = useLocale();

	return useMemo(() => {
		const { period } = dashboard;

		const exportCsv = () => {
			const rows = exportRowsOf(dashboard.rows);
			const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'csv');
			downloadCsv(rows, csvColumnsOf(t), fileName);
		};

		const exportPdf = async () => {
			const input = pdfInputOf(dashboard, locale, t);
			const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'pdf');
			const buildDocument = async () => {
				const { teamReportDocumentOf } = await import('./export/team-report-pdf');
				return teamReportDocumentOf(input);
			};
			await downloadPdf(buildDocument, fileName);
		};

		return [
			{ key: 'pdf', label: t('common.PDF'), icon: <FilePdf />, run: exportPdf },
			{ key: 'csv', label: t('dashboard.team.export.CSV'), icon: <FileSheet />, run: exportCsv }
		];
	}, [dashboard, locale, t]);
}
