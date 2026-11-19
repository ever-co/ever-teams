import { withoutTrailingSlashes } from './address';
import { clientError } from './error-mapping';
import { EverTeamsError } from './errors';

export const isFilled = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Whether the value is an http or https address. */
export function isWebAddress(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	return url.protocol === 'https:' || url.protocol === 'http:';
}

// The messages never quote a value: a secret passed in the wrong option would end up in them.
export const optionsError = (message: string, nextStep: string): EverTeamsError =>
	clientError('CLIENT_OPTIONS', message, nextStep);

/** apiUrl without its trailing slashes, once it is an http or https address; `nextStep` says what to pass instead. */
export function checkedApiUrl(caller: string, apiUrl: unknown, nextStep: string): string {
	if (!isFilled(apiUrl)) {
		throw optionsError(`${caller} needs apiUrl.`, nextStep);
	}
	const address = withoutTrailingSlashes(apiUrl.trim());
	if (!isWebAddress(address)) {
		throw optionsError(`${caller} needs apiUrl as an http or https address.`, nextStep);
	}
	return address;
}
