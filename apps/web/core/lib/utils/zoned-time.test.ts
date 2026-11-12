import { instantOf, nextSlotIn, wallClockOf } from './zoned-time';

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
});
