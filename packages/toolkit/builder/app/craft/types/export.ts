import { NodeTree } from '@craftjs/core';

export interface CraftNextJSExportOptions {
	projectName?: string;
	version?: string;
	dependencies?: Record<string, string>;
}

export interface ProcessedComponent {
	imports: Set<string>;
	code: string;
	styles: string;
}

export interface ExportError extends Error {
	type: 'EXPORT_ERROR';
	context: string;
	details: string;
}
