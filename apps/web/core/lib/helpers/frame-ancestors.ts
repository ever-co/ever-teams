/**
 * Who may show a page of the web app in a frame (ever-co/ever-teams#5527). Only the app itself, plus the sites a
 * deployment lists in FRAME_ANCESTORS: a page of any other site that frames the sign-in page could draw whatever it
 * wants around it.
 */

/** Pages no site may frame, the app itself included; next.config.js sends the same policy for them. */
const NEVER_FRAMED_PATHS = new Set(['/embed/authorize']);

/** `*`, or an http(s) origin whose host may start with `*.` and whose port may be `*` (a CSP host source). */
const FRAME_ANCESTOR_SOURCE = /^(?:\*|https?:\/\/(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::(?:\d{1,5}|\*))?)$/i;

/**
 * The sites a deployment lets frame the app, from FRAME_ANCESTORS (origins separated by commas or spaces). An entry
 * that is not an origin is left out, so the setting cannot add anything else to the header.
 */
export function frameAncestorSources(setting: string | undefined): string[] {
	const entries = (setting ?? '').split(/[\s,]+/);
	const origins = entries.map((entry) => entry.replace(/\/$/, ''));
	return origins.filter((origin) => FRAME_ANCESTOR_SOURCE.test(origin));
}

/** The Content-Security-Policy a page answers with, for its path without the locale prefix. */
export function frameAncestorsPolicy(pathname: string, setting: string | undefined): string {
	if (NEVER_FRAMED_PATHS.has(pathname)) {
		return "frame-ancestors 'none'";
	}
	const sources = ["'self'", ...frameAncestorSources(setting)];
	return `frame-ancestors ${sources.join(' ')}`;
}
