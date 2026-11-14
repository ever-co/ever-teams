/**
 * The pages of a shared report (ever-co/ever-teams#5200). Their address carries the token that opens the report, so
 * the error and analytics tools that record the address a visit starts on stay off there, as on the account deletion
 * pages. Kept dependency-free: those tools' start-up code imports it before the app bundle runs.
 */

/** Where a shared report is read, without signing in: `/shared-report/<token>`. */
export const SHARED_REPORT_PATH = '/shared-report';

// An optional two-letter locale segment (every APPLICATION_LANGUAGES_CODE entry is one), then /shared-report.
const SHARED_REPORT_PATH_PATTERN = /^(?:\/[a-z]{2})?\/shared-report(?:\/|$)/i;

/** True for `/shared-report/<token>` and its locale-prefixed form (`/fr/shared-report/<token>`). */
export function isSharedReportPath(pathname: string | null | undefined): boolean {
	return !!pathname && SHARED_REPORT_PATH_PATTERN.test(pathname);
}
