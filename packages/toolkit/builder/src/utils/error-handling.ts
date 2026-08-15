export enum GrapesJSErrorType {
	INITIALIZATION = 'initialization',
	COMPONENT_REGISTRATION = 'component_registration',
	EVENT_BINDING = 'event_binding',
	RENDERING = 'rendering'
}

export class GrapesJSError extends Error {
	constructor(
		public type: GrapesJSErrorType,
		public componentId: string,
		message: string
	) {
		super(`GrapesJS Error (${type}) - ${componentId}: ${message}`);
		this.name = 'GrapesJSError';
	}
}

export const handleGrapesJSError = (
	error: GrapesJSError,
	silent: boolean = false,
	context?: Record<string, any>
): void => {
	if (!silent) {
		console.error('GrapesJS Error:', {
			type: error.type,
			componentId: error.componentId,
			message: error.message,
			stack: error.stack,
			context
		});

		// In production, you might want to send to error tracking service
		// if (process.env.NODE_ENV === 'production') {
		//   errorTrackingService.captureException(error, { context });
		// }
	}
};
