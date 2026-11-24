/**
 * Test-only stand-in for a translator (never part of the app): a text is its key, followed by its values when it has
 * some, so a test reads which message a component shows and with what, in no language.
 */
export function translationKey(key: string, values?: Record<string, unknown>): string {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

/** A date as a test reads it: its day, whatever the language and the time zone of the machine. */
export function dayOf(value: Date): string {
	return `date(${value.toISOString().slice(0, 10)})`;
}
