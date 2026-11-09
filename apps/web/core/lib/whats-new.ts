import type { ChangelogEntry } from '@/core/services/client/api/changelog.service';

/** What the user has and has not seen of the "What's new" entries. Pure, shared by the hook and the panel. */

/** The date of the newest entry, or null when there is none. */
export function newestEntryDate(entries: readonly ChangelogEntry[]): string | null {
	let newest: string | null = null;
	for (const entry of entries) {
		if (!newest || new Date(entry.date).getTime() > new Date(newest).getTime()) {
			newest = entry.date;
		}
	}
	return newest;
}

/** Whether an entry is newer than what the user last saw (everything is, before the first look). */
export function isUnseenEntry(entry: ChangelogEntry, seenAt: string | null): boolean {
	if (!seenAt) {
		return true;
	}
	const seen = new Date(seenAt).getTime();
	return Number.isNaN(seen) || new Date(entry.date).getTime() > seen;
}

/** Whether any entry is newer than what the user last saw. */
export function hasUnseenEntries(entries: readonly ChangelogEntry[], seenAt: string | null): boolean {
	return entries.some((entry) => isUnseenEntry(entry, seenAt));
}
