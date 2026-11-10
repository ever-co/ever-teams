/**
 * The time zone every `format.dateTime` / `useFormatter` call of next-intl renders in.
 *
 * Until now the root provider pinned `Asia/Kolkata`, so dates and times on screen were Kolkata time for
 * everyone, and a user east of UTC+5:30 saw a plan's midnight as the previous day. The viewer's own zone
 * is used instead: the one they chose in Settings (stored in the active-timezone cookie), else the browser's.
 *
 * `Intl` validates the zone, not moment-timezone: this runs in the root layout of every page, and
 * moment-timezone (every zone's data) is kept to the few screens that need it (see `user-timezone.ts`).
 */

/** Fallback when neither the stored nor the browser zone is a zone `Intl` knows. */
export const DEFAULT_INTL_TIME_ZONE = 'UTC';

/**
 * The IANA id behind a stored zone label, or `null` when it is not a zone `Intl` knows. The settings
 * screens store either a bare id (`Europe/Kyiv`) or a label built by `userTimezone()`
 * (`America/New York (UTC -05:00)`): the offset suffix is dropped and spaces turn back into underscores.
 */
export function toIntlTimeZone(value?: string | null): string | null {
	if (!value) return null;
	const candidate = value.split('(')[0].trim().replace(/\s+/g, '_');
	if (!candidate) return null;
	try {
		// Validation only: `resolvedOptions().timeZone` would rename some ids to the runtime ICU's preferred
		// alias (`Asia/Kolkata` → `Asia/Calcutta` on some engines). Both work; keep the one the user chose.
		new Intl.DateTimeFormat('en-US', { timeZone: candidate });
		return candidate;
	} catch {
		return null;
	}
}

/** The browser's own zone, or `null` where the runtime cannot tell. */
export function browserIntlTimeZone(): string | null {
	try {
		return toIntlTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
	} catch {
		return null;
	}
}

/** The zone to render the viewer's dates in: their chosen zone, else the browser's, else UTC. */
export function viewerTimeZone(stored?: string | null, browser: string | null = browserIntlTimeZone()): string {
	return toIntlTimeZone(stored) ?? toIntlTimeZone(browser) ?? DEFAULT_INTL_TIME_ZONE;
}
