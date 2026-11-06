import JSDOMEnvironment from 'jest-environment-jsdom';

/**
 * jsdom with the host time zone moved west of UTC (America/New_York), for one test file.
 *
 * Opt in with `@jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts` at the top of the file.
 *
 * `new Date('2026-09-18')` is UTC midnight, `parseISO('2026-09-18')` is local midnight: on a UTC host (CI)
 * both fall on the same day, so a test of calendar-day handling only discriminates in another zone.
 * Jest gives each test file its own copy of `process.env`, so the test cannot set `TZ` itself: the
 * environment sets the worker's real one (Node re-reads it on assignment) and restores it on teardown,
 * before the worker runs its next file.
 */
export default class JSDOMWestOfUTCEnvironment extends JSDOMEnvironment {
	private previousTimeZone: string | undefined;

	async setup() {
		await super.setup();
		this.previousTimeZone = process.env.TZ;
		process.env.TZ = 'America/New_York';
	}

	async teardown() {
		if (this.previousTimeZone === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = this.previousTimeZone;
		}
		await super.teardown();
	}
}
