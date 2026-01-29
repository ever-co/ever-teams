export interface IUseDailyPlanOptions {
	/**
	 * Controls whether the queries should be enabled.
	 * Useful for lazy-loading daily plans only when needed (e.g., when accordion is expanded).
	 * @default true
	 */
	enabled?: boolean;
}
