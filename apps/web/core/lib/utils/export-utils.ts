/**
 * Utility functions for exporting data in various formats
 */

import { getDateString } from './date.utils';

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
	const timestamp = getDateString();
	const dateRange =
		startDate && endDate
			? `${getDateString(startDate)}-${getDateString(endDate)}`
			: timestamp;

	return `${baseName}-${dateRange}.${getFileExtension(format)}`;
}
