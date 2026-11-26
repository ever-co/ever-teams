/**
 * The three small readers every `suites/api` spec was carrying as its own copy.
 *
 * They are one file now because SonarQube Cloud scored them as new-code duplication (`5.8%` on PR #5675, required ≤ 3%)
 * and it was right: `triple` / `logOf` / `parseAnswer` were written identically in `foreign-origin`, `forwarded-host`,
 * `sweep`, `upstream-outage` and `upstream-dropped`. Nothing about *what they prove* changed — a mock-log entry as one
 * line, a whole log as one string for a failure message, and an answer parsed leniently so a failure message can show a
 * body that is not JSON.
 *
 * Typed on the three keys a log entry must have (`method`, `path`, `status`), not on `StubRequest`, because the mock's
 * own record is not what a case holds: `mock.requests()` returns them, and a filtered view or a mapped list is the same
 * shape. `StubRequest` therefore satisfies it without every caller importing it.
 */

/** One entry of the test backend's request log, as the line a failure message quotes: `POST /api/x 403`. */
export const triple = (request: { method: string; path: string; status: number }): string =>
	`${request.method} ${request.path} ${request.status}`;

/** The entries of a filtered view, in the order the backend recorded them. */
export const triples = (requests: Array<{ method: string; path: string; status: number }>): string[] =>
	requests.map(triple);

/** The whole log, for a failure message that has to show what the filtered view left out. */
export const logOf = (requests: Array<{ method: string; path: string; status: number }>): string =>
	triples(requests).join(', ');

/**
 * An answer body, read leniently: JSON when it is JSON, and the first 200 characters under `unparsed` when it is not —
 * which is what a red assertion needs, because "the route answered HTML where JSON was expected" is the finding.
 */
export function parseAnswer(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { unparsed: text.slice(0, 200) };
	}
}
