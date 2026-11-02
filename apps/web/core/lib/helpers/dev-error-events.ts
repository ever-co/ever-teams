/**
 * A browser event that carries a caught error to the development toaster. Plain module on purpose: the helpers that
 * announce errors are also imported by server code, which must not load the toast library.
 */
export const DEV_ERROR_EVENT = 'ever-teams:dev-error';

export type DevErrorSource = 'mutation' | 'query' | 'log';

export interface DevErrorDetail {
	source: DevErrorSource;
	/** Where it failed: a mutation or query key, or the context passed to `logErrorInDev`. */
	label: string;
	error: unknown;
}

export function announceDevError(detail: DevErrorDetail): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.dispatchEvent(new CustomEvent<DevErrorDetail>(DEV_ERROR_EVENT, { detail }));
}
