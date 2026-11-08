import type { ChangelogEntry } from '@/core/services/client/api/changelog.service';
import { hasUnseenEntries, isUnseenEntry, newestEntryDate } from '@/core/lib/whats-new';

const entry = (id: string, date: string): ChangelogEntry => ({
	id,
	icon: 'gift-outline',
	title: id,
	date,
	content: 'x',
	learnMoreUrl: null
});

describe("What's new: what the user has not seen", () => {
	const older = entry('older', '2026-10-02T00:00:00.000Z');
	const newer = entry('newer', '2026-11-08T00:00:00.000Z');

	it('finds the newest entry, whatever the order', () => {
		expect(newestEntryDate([older, newer])).toBe(newer.date);
		expect(newestEntryDate([newer, older])).toBe(newer.date);
		expect(newestEntryDate([])).toBeNull();
	});

	it('counts everything as unseen before the first look', () => {
		expect(isUnseenEntry(older, null)).toBe(true);
		expect(hasUnseenEntries([older], null)).toBe(true);
		expect(hasUnseenEntries([], null)).toBe(false);
	});

	it('counts only entries newer than the last look as unseen', () => {
		expect(hasUnseenEntries([older, newer], newer.date)).toBe(false);
		expect(isUnseenEntry(newer, older.date)).toBe(true);
		expect(isUnseenEntry(older, older.date)).toBe(false);
	});

	it('treats an unreadable stored date as never having looked', () => {
		expect(isUnseenEntry(older, 'garbage')).toBe(true);
	});
});
