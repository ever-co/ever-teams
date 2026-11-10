/**
 * The time zone every `format.dateTime` / `useFormatter` call of next-intl renders in.
 *
 * Until now the root provider pinned `Asia/Kolkata`, so dates and times on screen were Kolkata time for
 * everyone, and a user east of UTC+5:30 saw a plan's midnight as the previous day. The browser's zone is used
 * instead: it is the zone the app builds its `Date` values in (a plan day is a local midnight) and the one
 * date-fns / moment format in everywhere else, so a date-only value keeps its calendar day and a timestamp
 * shows the viewer's wall-clock time. It cannot change during a session, so the provider needs no updates.
 *
 * `Intl` validates the zone, not moment-timezone: this runs in the root layout of every page, and
 * moment-timezone (every zone's data) is kept to the few screens that need it (see `user-timezone.ts`).
 */

/** Fallback when the runtime does not name a zone `Intl` knows (and for the server render). */
export const DEFAULT_INTL_TIME_ZONE = 'UTC';

/** `value` when it is a zone `Intl` knows, else `null`. */
export function toIntlTimeZone(value?: string | null): string | null {
	const candidate = value?.trim();
	if (!candidate) return null;
	try {
		// Validation only: `resolvedOptions().timeZone` would rename some ids to the runtime ICU's preferred
		// alias (`Asia/Kolkata` → `Asia/Calcutta` on some engines). Both work; keep the one given.
		new Intl.DateTimeFormat('en-US', { timeZone: candidate });
		return candidate;
	} catch {
		return null;
	}
}

/** The browser's zone, or UTC where the runtime cannot name one. */
export function browserIntlTimeZone(
	detect: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().timeZone
): string {
	try {
		return toIntlTimeZone(detect()) ?? DEFAULT_INTL_TIME_ZONE;
	} catch {
		return DEFAULT_INTL_TIME_ZONE;
	}
}
