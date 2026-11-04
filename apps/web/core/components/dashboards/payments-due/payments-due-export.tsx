'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet } from '@/core/components/icons';
import type { PaymentsDueShown } from '@/core/hooks/dashboards/payments-due/use-payments-due-report';
import { type CsvColumn, downloadCsv, downloadPdf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import {
	decimalHoursOf,
	formatOwed,
	owedExportRowsOf,
	type OwedExportRow,
	type OwedFigures,
	type OwedMemberGroup,
	roundedAmountOf
} from '@/core/lib/utils/dashboards/payments-due';
import type { PaymentsPdfContent, PaymentsPdfRow, PaymentsPdfTotal } from './payments-due-pdf';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'payments-due';

const MISSING_FIGURE = '–';

const PDF_UNSUPPORTED_SPACES = /[\u00A0\u2009\u202F]/g;

/**
 * The PDF's standard Helvetica has no glyph for the thin, narrow and non-breaking spaces locales put in numbers,
 * dates and ranges (French thousands, the space before "€", "10:12 AM", "Nov 1 – 30"): they become plain spaces.
 */
function pdfTextOf(text: string) {
	return text.replace(PDF_UNSUPPORTED_SPACES, ' ');
}

function amountCellOf(row: OwedExportRow) {
	if (row.amount === null) {
		return null;
	}
	return roundedAmountOf(row.amount);
}

function csvColumnsOf(t: Translate): CsvColumn<OwedExportRow>[] {
	const totalLabel = t('common.TOTAL');
	const dateCellOf = (row: OwedExportRow) => row.dateKey ?? totalLabel;
	return [
		{ header: t('common.MEMBER'), valueOf: (row) => row.member },
		{ header: t('common.DATE'), valueOf: dateCellOf },
		{ header: t('dashboard.paymentsDue.export.DURATION_HOURS'), valueOf: (row) => decimalHoursOf(row.seconds) },
		{ header: t('dashboard.paymentsDue.export.RATE_PER_HOUR'), valueOf: (row) => row.rate },
		{ header: t('dashboard.paymentsDue.export.CURRENCY'), valueOf: (row) => row.currency },
		{ header: t('dashboard.paymentsDue.COLUMN_OWED'), valueOf: amountCellOf }
	];
}

function pdfRateOf(group: OwedMemberGroup, locale: string, t: Translate) {
	if (group.rate === null) {
		return t('dashboard.paymentsDue.NO_RATE');
	}
	const rate = formatOwed(group.rate, group.currency, locale);
	const unit = t('dashboard.paymentsDue.HOUR_UNIT');
	return pdfTextOf(`${rate}${unit}`);
}

function pdfOwedOf(amount: number | null, currency: string | null, locale: string) {
	if (amount === null) {
		return MISSING_FIGURE;
	}
	return pdfTextOf(formatOwed(amount, currency, locale));
}

function pdfRowsOf(groups: ReadonlyArray<OwedMemberGroup>, locale: string, t: Translate): PaymentsPdfRow[] {
	return groups.map((group) => ({
		key: group.key,
		member: group.name,
		rate: pdfRateOf(group, locale, t),
		tracked: formatDurationShort(group.seconds),
		owed: pdfOwedOf(group.amount, group.currency, locale)
	}));
}

function currencyTotalLabelOf(currency: string | null, t: Translate) {
	if (currency) {
		return t('dashboard.paymentsDue.TOTAL_IN', { currency });
	}
	return t('dashboard.paymentsDue.TOTAL_BARE');
}

function pdfTotalsOf(figures: OwedFigures, locale: string, t: Translate): PaymentsPdfTotal[] {
	const totals: PaymentsPdfTotal[] = figures.currencies.map((total) => ({
		key: `currency:${total.key}`,
		label: currencyTotalLabelOf(total.currency, t),
		members: t('dashboard.paymentsDue.MEMBERS_COUNT', { count: total.memberCount }),
		tracked: formatDurationShort(total.seconds),
		owed: pdfOwedOf(total.amount, total.currency, locale)
	}));
	const hasUnpriced = figures.unpriced.memberCount > 0;
	if (hasUnpriced) {
		totals.push({
			key: 'unpriced',
			label: t('dashboard.paymentsDue.TOTAL_UNPRICED'),
			members: t('dashboard.paymentsDue.MEMBERS_COUNT', { count: figures.unpriced.memberCount }),
			tracked: formatDurationShort(figures.unpriced.seconds),
			owed: MISSING_FIGURE
		});
	}
	return totals;
}

interface PdfInput {
	shown: PaymentsDueShown;
	title: string;
	periodText: string;
	locale: string;
	t: Translate;
}

function pdfContentOf({ shown, title, periodText, locale, t }: PdfInput): PaymentsPdfContent {
	const generatedFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const generatedDate = generatedFormat.format(new Date());
	const generatedOn = t('dashboard.paymentsDue.export.GENERATED_ON', { date: generatedDate });
	return {
		title: pdfTextOf(title),
		period: pdfTextOf(periodText),
		generatedOn: pdfTextOf(generatedOn),
		note: t('dashboard.paymentsDue.NOTE'),
		columns: {
			member: t('common.MEMBER'),
			rate: t('common.RATE'),
			tracked: t('dashboard.paymentsDue.COLUMN_TRACKED'),
			owed: t('dashboard.paymentsDue.COLUMN_OWED')
		},
		rows: pdfRowsOf(shown.memberGroups, locale, t),
		totals: pdfTotalsOf(shown.figures, locale, t),
		pageLabel: (page, total) => t('dashboard.paymentsDue.export.PAGE_OF', { page, total })
	};
}

async function pdfDocumentOf(input: PdfInput) {
	const { PaymentsDuePdfDocument } = await import('./payments-due-pdf');
	const content = pdfContentOf(input);
	return <PaymentsDuePdfDocument content={content} />;
}

export function usePaymentsDueExportOptions({
	shown,
	teamName
}: Readonly<{ shown: PaymentsDueShown | null; teamName: string }>): ExportOption[] {
	const t = useTranslations();
	const locale = useLocale();

	return useMemo(() => {
		if (!shown) {
			return [];
		}
		const periodText = formatPeriod(shown.period, locale);
		const title = t('dashboard.paymentsDue.export.PDF_TITLE', { team: teamName, period: periodText });
		const pdfFileName = periodFileNameOf(FILE_PREFIX, shown.period.from, shown.period.to, 'pdf');
		const csvFileName = periodFileNameOf(FILE_PREFIX, shown.period.from, shown.period.to, 'csv');
		const pdfInput: PdfInput = { shown, title, periodText, locale, t };

		return [
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf />,
				run: () => downloadPdf(() => pdfDocumentOf(pdfInput), pdfFileName)
			},
			{
				key: 'csv',
				label: t('dashboard.weeklyLimit.CSV'),
				icon: <FileSheet />,
				run: () => {
					const rows = owedExportRowsOf(shown.memberGroups);
					const columns = csvColumnsOf(t);
					downloadCsv(rows, columns, csvFileName);
				}
			}
		];
	}, [locale, shown, t, teamName]);
}
