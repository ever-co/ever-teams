export const EXIT_DONE = 0;
export const EXIT_FAILED = 1;
export const EXIT_USAGE = 2;

/** A command line that cannot be read: an unknown command or option, a value missing or not in its form. */
export class UsageError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UsageError';
	}
}

/** What the command line refuses by itself: one sentence that says what to do next. */
export class Refusal extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = 'Refusal';
		this.code = code;
	}
}
