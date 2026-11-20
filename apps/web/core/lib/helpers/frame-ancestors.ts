/**
 * Who may show a page of the web app in a frame (ever-co/ever-teams#5527). Only the app itself: a page of any other
 * site that frames the sign-in page could draw whatever it wants around it.
 */

/** Pages no site may frame, the app itself included; next.config.js sends the same policy for them. */
const NEVER_FRAMED_PATHS = new Set(['/embed/authorize']);

/** The Content-Security-Policy a page answers with, for its path without the locale prefix. */
export function frameAncestorsPolicy(pathname: string): string {
	if (NEVER_FRAMED_PATHS.has(pathname)) {
		return "frame-ancestors 'none'";
	}
	return "frame-ancestors 'self'";
}
