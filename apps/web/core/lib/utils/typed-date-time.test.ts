import {
	WORKSPACE_DATE_FORMATS,
	type WorkspaceClock,
	type WorkspaceDateFormat,
	type WorkspaceLocale
} from './workspace-formats';
import { dayWritingOf, minutesOfTimeValue, timeValueOf, timeWritingOf } from './typed-date-time';

const LANGUAGES = ['en', 'fr', 'de', 'ar', 'bg', 'es', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'];

function workspace(tag: string, choices: { clock?: WorkspaceClock; dateFormat?: WorkspaceDateFormat }) {
	const locale: WorkspaceLocale = {
		tag,
		dateFormat: choices.dateFormat ?? null,
		numberFormat: null,
		clock: choices.clock ?? null
	};
	return locale;
}

function everyQuarterHour() {
	return Array.from({ length: 96 }, (_, index) => timeValueOf(index * 15));
}

describe('time values', () => {
	it('counts the minutes of an HH:mm value and writes them back', () => {
		expect(minutesOfTimeValue('00:00')).toBe(0);
		expect(minutesOfTimeValue('21:05')).toBe(1265);
		expect(timeValueOf(1265)).toBe('21:05');
		expect(minutesOfTimeValue('24:00')).toBeNull();
		expect(minutesOfTimeValue('9:05')).toBeNull();
		expect(minutesOfTimeValue('')).toBeNull();
	});
});

describe('timeWritingOf', () => {
	it("writes a time on the reader's language clock without a workspace clock", () => {
		expect(timeWritingOf('en').textOf('21:05')).toBe('9:05 PM');
		expect(timeWritingOf('fr').textOf('21:05')).toBe('21:05');
		expect(timeWritingOf('fr').textOf('09:05')).toBe('09:05');
	});

	it("writes a time on the workspace's clock whatever the language", () => {
		expect(timeWritingOf(workspace('en', { clock: 24 })).textOf('09:05')).toBe('09:05');
		expect(timeWritingOf(workspace('fr', { clock: 12 })).textOf('21:05')).toBe('9:05 PM');
	});

	it('writes nothing for no time and gives an example for an empty field', () => {
		expect(timeWritingOf('en').textOf('')).toBe('');
		expect(timeWritingOf('en').textOf('25:00')).toBe('');
		expect(timeWritingOf('en').placeholder).toBe('9:00 AM');
		expect(timeWritingOf('de').placeholder).toBe('09:00');
	});

	it.each([
		['9:30', '09:30'],
		['9.30', '09:30'],
		['9h30', '09:30'],
		['930', '09:30'],
		['0930', '09:30'],
		['21:30', '21:30'],
		['9', '09:00'],
		['9:3', '09:03'],
		['9:30 pm', '21:30'],
		['9:30 PM', '21:30'],
		['9:30p', '21:30'],
		['9 pm', '21:00'],
		['9:30 am', '09:30'],
		['12 am', '00:00'],
		['12:15 pm', '12:15'],
		['  7:45  ', '07:45']
	])('reads %p as %p', (typed, value) => {
		expect(timeWritingOf('en').read(typed)).toBe(value);
	});

	it.each(['', 'abc', '24:00', '9:60', '13 pm', '9:30 xyz', '9:30 5', '12345', '9:300'])(
		'reads nothing in %p',
		(typed) => {
			expect(timeWritingOf('en').read(typed)).toBeNull();
		}
	);

	it('reads the half of the day and the digits of the language', () => {
		expect(timeWritingOf('zh').read('下午9:30')).toBe('21:30');
		expect(timeWritingOf('ar').read('٩:٣٠ م')).toBe('21:30');
		expect(timeWritingOf('es').read('9:30 p. m.')).toBe('21:30');
	});

	it.each(LANGUAGES)('reads back every time it writes in %s, on either clock', (tag) => {
		for (const clock of [12, 24] as WorkspaceClock[]) {
			const writing = timeWritingOf(workspace(tag, { clock }));
			for (const value of everyQuarterHour()) {
				expect(writing.read(writing.textOf(value))).toBe(value);
			}
		}
		const languageClock = timeWritingOf(tag);
		for (const value of everyQuarterHour()) {
			expect(languageClock.read(languageClock.textOf(value))).toBe(value);
		}
	});
});

describe('dayWritingOf', () => {
	it("writes a day in the reader's language without a workspace format", () => {
		expect(dayWritingOf('en').textOf('2026-12-31')).toBe('12/31/2026');
		expect(dayWritingOf('fr').textOf('2026-12-31')).toBe('31/12/2026');
		expect(dayWritingOf('ar').textOf('2026-12-31')).toBe('31/12/2026');
	});

	it("writes a day in the workspace's format whatever the language", () => {
		expect(dayWritingOf(workspace('en', { dateFormat: 'DD.MM.YYYY' })).textOf('2026-03-04')).toBe('04.03.2026');
		expect(dayWritingOf(workspace('fr', { dateFormat: 'MM/DD/YYYY' })).textOf('2026-03-04')).toBe('03/04/2026');
	});

	it('writes nothing for no day and gives an example for an empty field', () => {
		expect(dayWritingOf('en').textOf('')).toBe('');
		expect(dayWritingOf('en').textOf('2026-13-01x')).toBe('');
		expect(dayWritingOf('en').placeholder).toBe(`12/31/${new Date().getFullYear()}`);
	});

	it('reads a day in the order the field writes it, or year first', () => {
		expect(dayWritingOf('en').read('12/31/2026')).toBe('2026-12-31');
		expect(dayWritingOf('en').read('3/4/2026')).toBe('2026-03-04');
		expect(dayWritingOf('fr').read('4/3/2026')).toBe('2026-03-04');
		expect(dayWritingOf('fr').read('2026-03-04')).toBe('2026-03-04');
		expect(dayWritingOf('zh').read('2026/3/4')).toBe('2026-03-04');
		expect(dayWritingOf('ar').read('٤/٣/٢٠٢٦')).toBe('2026-03-04');
	});

	it.each(['', '12/31', '12/31/26', '2/30/2026', '13/01/2026', '12/31/2026/1', 'tomorrow'])(
		'reads nothing in %p',
		(typed) => {
			expect(dayWritingOf('en').read(typed)).toBeNull();
		}
	);

	it('reads the 29th of February of a leap year only', () => {
		expect(dayWritingOf('en').read('2/29/2028')).toBe('2028-02-29');
		expect(dayWritingOf('en').read('2/29/2026')).toBeNull();
	});

	it.each(LANGUAGES)('reads back every day it writes in %s, in every workspace format', (tag) => {
		const days = ['2026-01-01', '2026-03-04', '2026-12-31', '2028-02-29'];
		for (const dateFormat of [undefined, ...WORKSPACE_DATE_FORMATS]) {
			const writing = dayWritingOf(workspace(tag, { dateFormat }));
			for (const day of days) {
				expect(writing.read(writing.textOf(day))).toBe(day);
			}
		}
	});
});
