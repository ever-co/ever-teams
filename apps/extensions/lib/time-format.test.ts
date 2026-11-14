import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { badgeText, formatClock, secondsSince } from './time-format.ts';

describe('formatClock', () => {
	it('reads a run as hours, minutes and seconds, like the top bar timer', () => {
		assert.equal(formatClock(0), '00:00:00');
		assert.equal(formatClock(625), '00:10:25');
		assert.equal(formatClock(10_559), '02:55:59');
	});

	it('keeps counting hours past a day instead of wrapping', () => {
		assert.equal(formatClock(26 * 3600 + 5), '26:00:05');
	});

	it('reads a negative or broken count as zero', () => {
		assert.equal(formatClock(-12), '00:00:00');
		assert.equal(formatClock(Number.NaN), '00:00:00');
	});
});

describe('badgeText', () => {
	it('shows hours and minutes while they fit the badge', () => {
		assert.equal(badgeText(0), '0:00');
		assert.equal(badgeText(5 * 60 + 59), '0:05');
		assert.equal(badgeText(9 * 3600 + 59 * 60), '9:59');
	});

	it('shows whole hours from ten hours on', () => {
		assert.equal(badgeText(10 * 3600), '10h');
		assert.equal(badgeText(123 * 3600), '123h');
	});
});

describe('secondsSince', () => {
	it('counts whole seconds from a start to now', () => {
		const start = '2026-11-14T09:00:00.000Z';
		const now = Date.parse('2026-11-14T09:10:25.900Z');

		assert.equal(secondsSince(start, now), 625);
	});

	it('never counts a start in the future or an unreadable one', () => {
		const now = Date.parse('2026-11-14T09:00:00.000Z');

		assert.equal(secondsSince('2026-11-14T09:00:30.000Z', now), 0);
		assert.equal(secondsSince('not a date', now), 0);
	});
});
