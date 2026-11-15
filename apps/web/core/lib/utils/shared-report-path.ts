/**
 * The pages of a shared report (ever-co/ever-teams#5200). Their address carries the token that opens the report in its
 * fragment (`/shared-report#token=<token>`), which the browser never sends to a server: no access log, no server-side
 * error report and no `Referer` holds it, as the account deletion link keeps its own (account-deletion.ts). The error
 * and analytics tools that record the whole address a visit starts on stay off there all the same, as on the account
 * deletion pages. Kept dependency-free: those tools' start-up code imports it before the app bundle runs.
 */

/** Where a shared report is read, without signing in: `/shared-report#token=<token>`. */
export const SHARED_REPORT_PATH = '/shared-report';

/** The name of the token in the fragment of a shared report's address. */
const SHARED_REPORT_TOKEN_KEY = 'token';

// An optional two-letter locale segment (every APPLICATION_LANGUAGES_CODE entry is one), then /shared-report.
const SHARED_REPORT_PATH_PATTERN = /^(?:\/[a-z]{2})?\/shared-report(?:\/|$)/i;

/** True for `/shared-report` and its locale-prefixed form (`/fr/shared-report`). */
export function isSharedReportPath(pathname: string | null | undefined): boolean {
	return !!pathname && SHARED_REPORT_PATH_PATTERN.test(pathname);
}

/** The fragment of a shared report's address, `#token=<token>`: the one part of an address no server receives. */
export function sharedReportFragmentOf(token: string): string {
	return `#${new URLSearchParams({ [SHARED_REPORT_TOKEN_KEY]: token }).toString()}`;
}

/** The token the fragment of a shared report's address carries (`location.hash`); empty when it carries none. */
export function sharedReportTokenOf(hash: string | null | undefined): string {
	const fragment = new URLSearchParams((hash ?? '').replace(/^#/, ''));
	return (fragment.get(SHARED_REPORT_TOKEN_KEY) ?? '').trim();
}
