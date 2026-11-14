import {
	DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY,
	KEPT_TIME_ZONE_PAIR_STORAGE_KEY,
	readStoredPair,
	timeZoneNoticeOf,
	timeZonePairKeyOf,
	writeStoredPair
} from './time-zone-notice';

const NOVEMBER_14 = new Date('2026-11-14T12:00:00Z');

function noticeFor(
	profileValue: string | null,
	browserZone: string | null,
	stored: { kept?: string; dismissed?: string } = {}
) {
	return timeZoneNoticeOf({
		profileValue,
		browserZone,
		keptPair: stored.kept ?? null,
		dismissedPair: stored.dismissed ?? null,
		now: NOVEMBER_14
	});
}

function storageWith(entries: Record<string, string> = {}): Storage {
	const values = new Map(Object.entries(entries));
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key: string) => values.get(key) ?? null,
		key: (index: number) => [...values.keys()][index] ?? null,
		removeItem: (key: string) => {
			values.delete(key);
		},
		setItem: (key: string, value: string) => {
			values.set(key, value);
		}
	};
}

function refusingStorage(): Storage {
	const storage = storageWith();
	storage.getItem = () => {
		throw new Error('blocked');
	};
	storage.setItem = () => {
		throw new Error('blocked');
	};
	return storage;
}

describe('timeZoneNoticeOf', () => {
	it('names both zones with their offsets when the browser is in another zone', () => {
		const notice = noticeFor('Africa/Kinshasa (UTC +01:00)', 'America/New_York');

		expect(notice).toEqual({
			profileZone: 'Africa/Kinshasa',
			profileOffset: '+01:00',
			browserZone: 'America/New_York',
			browserOffset: '-05:00',
			pairKey: 'Africa/Kinshasa|America/New_York'
		});
	});

	it('says nothing when both zones are the same, whatever the stored spelling', () => {
		expect(noticeFor('America/New_York (UTC -05:00)', 'America/New_York')).toBeNull();
		expect(noticeFor('america/new york', 'America/New_York')).toBeNull();
	});

	it('compares the year of offsets only for two different names', () => {
		const formatToParts = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');

		expect(noticeFor('America/New_York (UTC -05:00)', 'America/New_York')).toBeNull();

		// The browser offset is read once; the same name needs no day-by-day comparison
		expect(formatToParts.mock.calls.length).toBeLessThanOrEqual(2);
		formatToParts.mockRestore();
	});

	it('says nothing for two names of zones that keep the same time all year', () => {
		expect(noticeFor('Europe/Brussels (UTC +01:00)', 'Europe/Paris')).toBeNull();
	});

	it('speaks up for zones that share an offset today but not all year', () => {
		const notice = noticeFor('Africa/Lagos (UTC +01:00)', 'Europe/Paris');

		expect(notice?.profileZone).toBe('Africa/Lagos');
		expect(notice?.browserZone).toBe('Europe/Paris');
	});

	it('offers the browser zone to a profile without one', () => {
		const notice = noticeFor(null, 'America/New_York');

		expect(notice).toEqual({
			profileZone: null,
			profileOffset: null,
			browserZone: 'America/New_York',
			browserOffset: '-05:00',
			pairKey: '|America/New_York'
		});
	});

	it('reads a stored name that no zone answers to as no zone', () => {
		const notice = noticeFor('Mars/Olympus (UTC +09:00)', 'America/New_York');

		expect(notice?.profileZone).toBeNull();
		expect(notice?.profileOffset).toBeNull();
		expect(notice?.pairKey).toBe('|America/New_York');
	});

	it('stays hidden for the pair the person kept, and comes back when the browser moves', () => {
		const kept = 'Africa/Kinshasa|America/New_York';

		expect(noticeFor('Africa/Kinshasa (UTC +01:00)', 'America/New_York', { kept })).toBeNull();
		expect(noticeFor('Africa/Kinshasa (UTC +01:00)', 'America/Chicago', { kept })).not.toBeNull();
	});

	it('stays hidden for the pair closed in this session', () => {
		const dismissed = 'Africa/Kinshasa|America/New_York';

		expect(noticeFor('Africa/Kinshasa (UTC +01:00)', 'America/New_York', { dismissed })).toBeNull();
	});

	it('says nothing while the browser zone is unknown or not a zone', () => {
		expect(noticeFor('Africa/Kinshasa (UTC +01:00)', null)).toBeNull();
		expect(noticeFor('Africa/Kinshasa (UTC +01:00)', 'Not/AZone')).toBeNull();
	});
});

describe('timeZonePairKeyOf', () => {
	it('keeps the profile side empty when the profile has no zone', () => {
		expect(timeZonePairKeyOf('Africa/Kinshasa', 'America/New_York')).toBe('Africa/Kinshasa|America/New_York');
		expect(timeZonePairKeyOf(null, 'America/New_York')).toBe('|America/New_York');
	});
});

describe('stored pairs', () => {
	it('reads back what it wrote', () => {
		const storage = storageWith();

		const isWritten = writeStoredPair(storage, KEPT_TIME_ZONE_PAIR_STORAGE_KEY, 'Africa/Kinshasa|America/New_York');

		expect(isWritten).toBe(true);
		expect(readStoredPair(storage, KEPT_TIME_ZONE_PAIR_STORAGE_KEY)).toBe('Africa/Kinshasa|America/New_York');
		expect(readStoredPair(storage, DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY)).toBeNull();
	});

	it('treats a browser that refuses its storage as one that remembers nothing', () => {
		const storage = refusingStorage();

		expect(writeStoredPair(storage, KEPT_TIME_ZONE_PAIR_STORAGE_KEY, 'a|b')).toBe(false);
		expect(readStoredPair(storage, KEPT_TIME_ZONE_PAIR_STORAGE_KEY)).toBeNull();
		expect(readStoredPair(null, KEPT_TIME_ZONE_PAIR_STORAGE_KEY)).toBeNull();
		expect(writeStoredPair(null, KEPT_TIME_ZONE_PAIR_STORAGE_KEY, 'a|b')).toBe(false);
	});
});
