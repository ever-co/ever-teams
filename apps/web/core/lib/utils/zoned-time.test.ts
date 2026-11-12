import { instantOf, nextSlotIn, slotOnDay, wallClockOf } from './zoned-time';

describe('zoned time', () => {
	it('reads a date and a time on the clocks of a zone, and an instant back on them', () => {
		expect(instantOf('2026-11-12', '14:30', 'Europe/London').toISOString()).toBe('2026-11-12T14:30:00.000Z');
		expect(instantOf('2026-11-12', '14:30', 'America/New_York').toISOString()).toBe('2026-11-12T19:30:00.000Z');
		expect(instantOf('2026-11-12', '14:30', 'Asia/Kolkata').toISOString()).toBe('2026-11-12T09:00:00.000Z');
		expect(wallClockOf(new Date('2026-11-12T19:30:00.000Z'), 'America/New_York')).toEqual({
			date: '2026-11-12',
			time: '14:30'
		});
		expect(wallClockOf(new Date('2026-11-12T23:30:00.000Z'), 'Asia/Tokyo')).toEqual({
			date: '2026-11-13',
			time: '08:30'
		});
		expect(Number.isNaN(instantOf('', '', 'UTC').getTime())).toBe(true);
	});

	it('takes the first of a time the clocks show twice, and lands past a time they skip', () => {
		// New York goes back from 2:00 to 1:00 on 1 November 2026, London on 25 October: 1:30 happens twice
		expect(instantOf('2026-11-01', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z');
		expect(instantOf('2026-10-25', '01:30', 'Europe/London').toISOString()).toBe('2026-10-25T00:30:00.000Z');
		// New York skips from 2:00 to 3:00 on 8 March 2026: 2:30 never shows, 3:30 does
		expect(instantOf('2026-03-08', '02:30', 'America/New_York').toISOString()).toBe('2026-03-08T07:30:00.000Z');
	});

	it('proposes the next half hour on the clocks of the zone, on the next day past midnight', () => {
		const lateEvening = new Date('2026-11-12T23:40:00.000Z');

		expect(nextSlotIn('UTC', lateEvening)).toEqual({ date: '2026-11-13', time: '00:00' });
		expect(nextSlotIn('America/New_York', lateEvening)).toEqual({ date: '2026-11-12', time: '19:00' });
		// Kathmandu is 5:45 ahead: 5:25 there, so 5:30
		expect(nextSlotIn('Asia/Kathmandu', lateEvening)).toEqual({ date: '2026-11-13', time: '05:30' });
		expect(nextSlotIn('UTC', new Date('2026-11-12T10:30:00.000Z'))).toEqual({ date: '2026-11-12', time: '11:00' });
	});

	it('never proposes a time the clocks skip, nor the passed first showing of a time they repeat', () => {
		// New York skips from 2:00 to 3:00 on 8 March 2026: at 1:45 the next half hour that exists is 3:00
		const beforeTheGap = new Date('2026-03-08T06:45:00.000Z');
		expect(nextSlotIn('America/New_York', beforeTheGap)).toEqual({ date: '2026-03-08', time: '03:00' });
		// It goes back from 2:00 to 1:00 on 1 November: at the second 1:15, "1:30" names the first one, already past
		const inTheRepeat = new Date('2026-11-01T06:15:00.000Z');
		expect(nextSlotIn('America/New_York', inTheRepeat)).toEqual({ date: '2026-11-01', time: '02:00' });

		// What shows is what is saved, and it lies ahead
		for (const now of [beforeTheGap, inTheRepeat]) {
			const slot = nextSlotIn('America/New_York', now);
			const start = instantOf(slot.date, slot.time, 'America/New_York');
			expect(wallClockOf(start, 'America/New_York')).toEqual(slot);
			expect(start.getTime()).toBeGreaterThan(now.getTime());
		}
	});

	// Kiritimati is 14 hours ahead of UTC and Pago Pago 11 behind: wherever this runs, one of them is a day away
	const FAR_ZONES = ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Kathmandu', 'UTC'];
	const calendarDayOf = (date: Date) => [date.getFullYear(), date.getMonth(), date.getDate()];

	it('proposes the next half hour for today, or when no day is picked, whatever the zone', () => {
		// 08:00 UTC: still the 11th in Pago Pago, already the 12th where this runs
		const now = new Date('2026-11-12T08:00:00.000Z');
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		for (const zone of FAR_ZONES) {
			expect(slotOnDay(today, zone, now)).toEqual(nextSlotIn(zone, now));
			expect(slotOnDay(undefined, zone, now)).toEqual(nextSlotIn(zone, now));
		}
	});

	it("proposes a later day of the browser's calendar on that very day, at the next half hour's time of day there", () => {
		const now = new Date('2026-11-12T15:10:00.000Z');
		const later = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
		for (const zone of FAR_ZONES) {
			const slot = nextSlotIn(zone, now);
			const next = instantOf(slot.date, slot.time, zone);
			const clock = slotOnDay(later, zone, now);
			const start = instantOf(clock.date, clock.time, zone);

			// The agenda lists by the browser's days: the meeting shows on the day it was planned from
			expect(calendarDayOf(start)).toEqual(calendarDayOf(later));
			expect([start.getHours(), start.getMinutes()]).toEqual([next.getHours(), next.getMinutes()]);
		}
	});
});
