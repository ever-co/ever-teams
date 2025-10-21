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
