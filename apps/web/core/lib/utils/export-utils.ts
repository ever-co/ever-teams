/**
 * Utility functions for exporting data in various formats
 */

export interface ExportUtilsOptions {
	includeHeaders?: boolean;
	includeFilters?: boolean;
	dateFormat?: 'ISO' | 'US' | 'EU';
	delimiter?: string;
}
/**
 * Get appropriate file extension for export format
 */
export function getFileExtension(format: 'csv' | 'xlsx' | 'pdf'): string {
	switch (format) {
		case 'csv':
			return 'csv';
		case 'xlsx':
			return 'xlsx';
		case 'pdf':
			return 'pdf';
		default:
			return 'txt';
	}
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(
	baseName: string,
	format: 'csv' | 'xlsx' | 'pdf',
	startDate?: Date,
	endDate?: Date
): string {
	const timestamp = new Date().toISOString().split('T')[0];
	const dateRange =
		startDate && endDate
			? `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`
			: timestamp;

	return `${baseName}-${dateRange}.${getFileExtension(format)}`;
}

interface XLSXColumn<Row> {
	header: string;
	value: (row: Row) => string | number;
	width?: number;
	/** Excel number format for numeric cells, e.g. '0%' */
	format?: string;
}

interface XLSXExportOptions<Row> {
	/** The rows written in bold, such as a closing total. */
	isBoldRow?: (row: Row) => boolean;
}

function neverBold() {
	return false;
}

function xlsxCellOf(value: string | number, format: string | undefined, isBold: boolean) {
	if (isBold) {
		return { value, format, fontWeight: 'bold' as const };
	}
	return { value, format };
}

/**
 * Writes the rows to an .xlsx file and starts its download.
 * The writer is loaded on demand so it stays out of the page bundle.
 */
export async function exportToXLSX<Row>(
	rows: Row[],
	columns: XLSXColumn<Row>[],
	fileName: string,
	options: XLSXExportOptions<Row> = {}
): Promise<void> {
	const { default: writeXlsxFile } = await import('write-excel-file/browser');
	const isBoldRow = options.isBoldRow ?? neverBold;

	await writeXlsxFile(rows, {
		columns: columns.map(({ header, value, width, format }) => ({
			header: { value: header, fontWeight: 'bold' as const },
			cell: (row: Row) => xlsxCellOf(value(row), format, isBoldRow(row)),
			width
		}))
	}).toFile(fileName);
}
