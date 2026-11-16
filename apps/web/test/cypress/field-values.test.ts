import { dayWritingOf, timeWritingOf } from '@/core/lib/utils/typed-date-time';
import { shownMomentOf } from '../../cypress/support/field-values';

describe('shownMomentOf: the moment the meeting date and time fields show, as the browser gate reads them', () => {
	// What the fields write since #5325, in the gate's language: the app's own writing
	const shownDay = (value: string) => dayWritingOf('en').textOf(value);
	const shownTime = (value: string) => timeWritingOf('en').textOf(value);

	it('reads the day and the time the fields write in English, which no ISO parsing reads', () => {
		expect(shownDay('2026-11-16')).toBe('11/16/2026');
		// The gate's former reading: the agenda then showed the day after, and the meeting scheduled was never found
		expect(Number.isNaN(new Date(`${shownDay('2026-11-16')}T${shownTime('14:30')}:00Z`).getTime())).toBe(true);

		expect(shownMomentOf(shownDay('2026-11-16'), shownTime('14:30')).toISOString()).toBe(
			'2026-11-16T14:30:00.000Z'
		);
		expect(shownMomentOf(shownDay('2026-12-31'), shownTime('23:30')).toISOString()).toBe(
			'2026-12-31T23:30:00.000Z'
		);
	});

	it('reads midnight and noon, whatever space the runtime puts before AM or PM', () => {
		expect(shownMomentOf('11/16/2026', '12:05 AM').toISOString()).toBe('2026-11-16T00:05:00.000Z');
		expect(shownMomentOf('11/16/2026', '12:30\u202fPM').toISOString()).toBe('2026-11-16T12:30:00.000Z');
		expect(shownMomentOf('11/16/2026', shownTime('00:00')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
	});

	it('still reads a day and a time typed as the native fields took them', () => {
		expect(shownMomentOf('2030-01-15', '10:00').toISOString()).toBe('2030-01-15T10:00:00.000Z');
	});

	it('fails loudly on a text it cannot read', () => {
		expect(() => shownMomentOf('16.11.2026', '14:30')).toThrow('Cannot read the date');
		expect(() => shownMomentOf('11/16/2026', 'half past two')).toThrow('Cannot read the date');
	});
});
