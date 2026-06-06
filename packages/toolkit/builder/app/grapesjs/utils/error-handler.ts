import { GrapesJSErrorType, ERROR_MESSAGES } from '../constants/error-types';

export class GrapesJSError extends Error {
	constructor(
		public type: GrapesJSErrorType,
		public componentId: string,
		public details?: string
	) {
		const message = `${ERROR_MESSAGES[type]} - Component: ${componentId}${details ? ` - ${details}` : ''}`;
		super(message);
		this.name = 'GrapesJSError';
	}
}

export const handleComponentError = (error: unknown, componentId: string): void => {
	if (error instanceof GrapesJSError) {
		console.error(`[GrapesJS Error] ${error.message}`);
	} else {
		console.error(`[GrapesJS Error] Unexpected error in component ${componentId}:`, error);
	}
};

export const validateEditorInstance = (editor: any, componentId: string): void => {
	if (!editor?.DomComponents) {
		throw new GrapesJSError(
			GrapesJSErrorType.INITIALIZATION,
			componentId,
			'Editor or DomComponents not initialized'
		);
	}
};
