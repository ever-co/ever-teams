import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';

export interface CsvColumn<Row> {
	header: string;
	valueOf: (row: Row) => string | number | null | undefined;
}

/** Cells that a spreadsheet would read as a formula are prefixed, so an exported title can never run as one. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function neutralizedCell(text: string) {
	const startsLikeFormula = FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix));
	if (startsLikeFormula) {
		return `'${text}`;
	}
	return text;
}

function csvCellOf(value: string | number | null | undefined) {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'number') {
		return String(value);
	}
	const safeText = neutralizedCell(value);
	const needsQuotes = /[",\n\r;]/.test(safeText);
	const escaped = safeText.replaceAll('"', '""');
	if (needsQuotes) {
		return `"${escaped}"`;
	}
	return escaped;
}

export function csvOf<Row>(rows: ReadonlyArray<Row>, columns: ReadonlyArray<CsvColumn<Row>>): string {
	const headerLine = columns.map((column) => csvCellOf(column.header)).join(',');
	const lines = rows.map((row) => columns.map((column) => csvCellOf(column.valueOf(row))).join(','));
	return [headerLine, ...lines].join('\r\n');
}

export function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The byte order mark lets spreadsheet apps read accented names in UTF-8. */
const UTF8_BOM = '﻿';

export function downloadCsv<Row>(rows: ReadonlyArray<Row>, columns: ReadonlyArray<CsvColumn<Row>>, fileName: string) {
	const content = UTF8_BOM + csvOf(rows, columns);
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
	downloadBlob(blob, fileName);
}

/**
 * Renders a react-pdf document and downloads it. The renderer is imported here, on the click, so no report page
 * carries it in its first chunk; `buildDocument` imports the document module the same way.
 */
export async function downloadPdf(
	buildDocument: () => Promise<ReactElement<DocumentProps>>,
	fileName: string
): Promise<void> {
	const [{ pdf }, document] = await Promise.all([import('@react-pdf/renderer'), buildDocument()]);
	const blob = await pdf(document).toBlob();
	downloadBlob(blob, fileName);
}

const PDF_UNSUPPORTED_SPACES = /[\u00A0\u2009\u202F]/g;

/**
 * The PDF's standard Helvetica has no glyph for the thin, narrow and non-breaking spaces locales put in numbers,
 * dates and ranges (French thousands, the space before "€", "10:12 AM", "Nov 1 – 30"): they become plain spaces.
 */
export function pdfTextOf(text: string) {
	return text.replace(PDF_UNSUPPORTED_SPACES, ' ');
}

/** `team-report-2026-10-27-2026-11-02.csv`, from local calendar days so the name matches the period shown. */
export function periodFileNameOf(prefix: string, from: Date, to: Date, extension: 'csv' | 'pdf' | 'xlsx') {
	return `${prefix}-${localDayKeyOf(from)}-${localDayKeyOf(to)}.${extension}`;
}

export function localDayKeyOf(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
