/** The per-process replay cache of back-channel logout token ids. */
import { JtiReplayCache } from './jti-cache';

describe('JtiReplayCache', () => {
	it('refuses the same jti a second time', () => {
		const cache = new JtiReplayCache();

		expect(cache.seen('jti-1')).toBe(false);
		expect(cache.seen('jti-1')).toBe(true);
		expect(cache.seen('jti-2')).toBe(false);
	});

	it('forgets a jti after its lifetime', () => {
		let now = 1_000_000;
		const cache = new JtiReplayCache(600_000, 10, () => now);

		cache.seen('jti-1');
		now += 599_999;
		expect(cache.seen('jti-1')).toBe(true);
		now += 600_001;
		expect(cache.seen('jti-1')).toBe(false);
	});

	it('accepts a forgotten jti again', () => {
		const cache = new JtiReplayCache();

		cache.seen('jti-1');
		cache.forget('jti-1');

		expect(cache.seen('jti-1')).toBe(false);
	});

	it('keeps at most maxEntries, evicting the oldest first', () => {
		const cache = new JtiReplayCache(600_000, 3, () => 0);

		for (const jti of ['a', 'b', 'c', 'd']) cache.seen(jti);

		expect(cache.size).toBe(3);
		// 'a' was evicted, so it counts as new again; 'd' is still remembered.
		expect(cache.seen('d')).toBe(true);
		expect(cache.seen('a')).toBe(false);
	});
});
