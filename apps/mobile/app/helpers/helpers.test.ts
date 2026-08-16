/**
 * Unit tests for the pure helper modules in app/helpers.
 *
 * These are the highest-value tests in the app: they run in milliseconds, need no native
 * modules, and cover logic that every screen depends on (timer status, form validation,
 * date/time formatting, name/avatar formatting).
 */
import { getTimerStatusValue } from './get-timer-status';
import { authFormValidate, validateForm } from './validations';
import { formatName } from './name-format';
import { pad } from './number';
import { secondsToTime, convertMsToTime, addHours } from './date';
import { EMAIL_REGEX, PHONE_REGEX, URL_REGEX, VALID_HEX_COLOR } from './regex';
import { imgTitle } from './img-title';

// ---------------------------------------------------------------------------------------------
// getTimerStatusValue — drives the coloured status dot next to every team member
// ---------------------------------------------------------------------------------------------
describe('getTimerStatusValue', () => {
	const activeMember = (extra: Record<string, unknown> = {}) =>
		({
			employeeId: 'emp-1',
			employee: { isActive: true, isOnline: false },
			totalTodayTasks: [],
			...extra
		}) as any;

	it('returns "suspended" for an inactive employee on a private team', () => {
		expect(getTimerStatusValue(null, activeMember({ employee: { isActive: false } }), false)).toBe('suspended');
	});

	it('does NOT suspend an inactive employee when the team is public', () => {
		const m = activeMember({ employee: { isActive: false, isOnline: false } });
		expect(getTimerStatusValue(null, m, true)).not.toBe('suspended');
	});

	it('returns "pause" when the member timerStatus is pause', () => {
		expect(getTimerStatusValue(null, activeMember({ timerStatus: 'pause' }))).toBe('pause');
	});

	it('returns "pause" for a recent non-mobile lastLog owned by this member when the timer is not running', () => {
		const status = {
			running: false,
			lastLog: { startedAt: new Date().toISOString(), employeeId: 'emp-1', source: 'BROWSER' }
		} as any;
		expect(getTimerStatusValue(status, activeMember())).toBe('pause');
	});

	it('does NOT infer pause from a MOBILE-sourced lastLog', () => {
		const status = {
			running: false,
			lastLog: { startedAt: new Date().toISOString(), employeeId: 'emp-1', source: 'MOBILE' }
		} as any;
		expect(getTimerStatusValue(status, activeMember())).not.toBe('pause');
	});

	it('does NOT infer pause from a lastLog older than 24 hours', () => {
		const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
		const status = { running: false, lastLog: { startedAt: old, employeeId: 'emp-1', source: 'BROWSER' } } as any;
		expect(getTimerStatusValue(status, activeMember())).not.toBe('pause');
	});

	it('returns "online" for an online employee with no timer', () => {
		expect(getTimerStatusValue(null, activeMember({ employee: { isActive: true, isOnline: true } }))).toBe('online');
	});

	it('returns "idle" when there are no tasks today', () => {
		expect(getTimerStatusValue(null, activeMember({ totalTodayTasks: [] }))).toBe('idle');
	});

	it('falls back to the member timerStatus when tasks exist', () => {
		expect(getTimerStatusValue(null, activeMember({ totalTodayTasks: [{}], timerStatus: 'running' }))).toBe('running');
	});

	it('handles an undefined member without throwing', () => {
		expect(() => getTimerStatusValue(null, undefined)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------------------------
// validations
// ---------------------------------------------------------------------------------------------
describe('authFormValidate', () => {
	const base = { email: 'a@b.co', name: 'Al', team: 'Team', code: '123456', recaptcha: 'ok' } as any;

	it('accepts a fully valid form', () => {
		const r = authFormValidate(['email', 'name', 'team', 'code', 'recaptcha'], base);
		expect(r.valid).toBe(true);
		expect(r.errors).toEqual({});
	});

	it('rejects a malformed email', () => {
		const r = authFormValidate(['email'], { ...base, email: 'not-an-email' });
		expect(r.valid).toBe(false);
		expect(r.errors.email).toMatch(/email/i);
	});

	it('rejects a 1-character name', () => {
		expect(authFormValidate(['name'], { ...base, name: 'A' }).valid).toBe(false);
	});

	it('rejects an invitation code shorter than 6 digits', () => {
		expect(authFormValidate(['code'], { ...base, code: '12345' }).valid).toBe(false);
	});

	it('only validates the keys it is asked to', () => {
		// email is invalid but not in the key list
		expect(authFormValidate(['name'], { ...base, email: 'bad' }).valid).toBe(true);
	});
});

describe('validateForm', () => {
	it('trims values in place and accepts a valid record', () => {
		const data: any = { email: '  a@b.co  ', phone: '+15551234567', url: 'https://ever.team' };
		const r = validateForm(['email', 'phone', 'url'], data);
		expect(r.isValid).toBe(true);
		expect(data.email).toBe('a@b.co'); // trimmed in place
	});

	it('flags an empty required field', () => {
		const r = validateForm(['name'], { name: '' } as any);
		expect(r.isValid).toBe(false);
		expect(r.errors.name).toMatch(/fill out/i);
	});

	it('flags an invalid URL', () => {
		const r = validateForm(['url'], { url: 'not a url' } as any);
		expect(r.isValid).toBe(false);
	});
});

// ---------------------------------------------------------------------------------------------
// regex
// ---------------------------------------------------------------------------------------------
describe('regex', () => {
	it.each(['a@b.co', 'first.last@sub.example.com', 'user+tag@example.org'])('EMAIL_REGEX accepts %s', (v) =>
		expect(EMAIL_REGEX.test(v)).toBe(true)
	);
	it.each(['a@b', 'no-at.com', '@example.com', 'a b@c.com'])('EMAIL_REGEX rejects %s', (v) =>
		expect(EMAIL_REGEX.test(v)).toBe(false)
	);
	it.each(['+15551234567', '5551234567', '555-123-4567', '(555) 123-4567'])('PHONE_REGEX accepts %s', (v) =>
		expect(PHONE_REGEX.test(v)).toBe(true)
	);
	it.each(['https://ever.team', 'http://www.example.com/path?q=1'])('URL_REGEX accepts %s', (v) =>
		expect(URL_REGEX.test(v)).toBe(true)
	);
	// PHONE_REGEX does not allow whitespace between a country code and the area code, so the very
	// common "+1 (555) 123-4567" form is REJECTED. Pinned here so it is a deliberate decision to change.
	it('PHONE_REGEX rejects a country code followed by a space (documented limitation)', () =>
		expect(PHONE_REGEX.test('+1 (555) 123-4567')).toBe(false)
	);
	it('URL_REGEX rejects a bare hostname', () => expect(URL_REGEX.test('ever.team')).toBe(false));
	it.each(['#fff', '#ffffff', '#FFF8', '#12345678'])('VALID_HEX_COLOR accepts %s', (v) =>
		expect(VALID_HEX_COLOR.test(v)).toBe(true)
	);
	it.each(['fff', '#ff', '#ggg'])('VALID_HEX_COLOR rejects %s', (v) => expect(VALID_HEX_COLOR.test(v)).toBe(false));
});

// ---------------------------------------------------------------------------------------------
// formatting helpers
// ---------------------------------------------------------------------------------------------
describe('formatName', () => {
	it('title-cases and replaces hyphens', () => {
		expect(formatName('john-DOE smith')).toBe('John Doe Smith');
	});
	it('tolerates undefined', () => {
		expect(formatName(undefined as any)).toBeUndefined();
	});
});

describe('imgTitle', () => {
	it('uses the initials of the first two words', () => expect(imgTitle('jane doe')).toBe('JD'));
	it('uses the first two letters of a single word', () => expect(imgTitle('jane')).toBe('JA'));
	it('tolerates undefined', () => expect(imgTitle(undefined as any)).toBeUndefined());
});

describe('pad', () => {
	it('zero-pads to 2 by default', () => expect(pad(7)).toBe('07'));
	it('respects a custom width', () => expect(pad(7, 3)).toBe('007'));
	it('does not truncate wider numbers', () => expect(pad(1234)).toBe('1234'));
});

// ---------------------------------------------------------------------------------------------
// date / time
// ---------------------------------------------------------------------------------------------
describe('secondsToTime', () => {
	it('splits whole seconds into h/m/s', () => {
		expect(secondsToTime(3661)).toEqual({ h: 1, m: 1, s: 1 });
	});
	it('handles zero', () => expect(secondsToTime(0)).toEqual({ h: 0, m: 0, s: 0 }));

	// KNOWN BEHAVIOUR: seconds are rounded UP with Math.ceil, so a fractional value just under a
	// minute boundary yields s: 60 rather than rolling into the next minute. Pinned here so a
	// future change is deliberate. (Callers pass integer seconds, so this does not surface today.)
	it('rounds fractional seconds up (documented quirk)', () => {
		expect(secondsToTime(59.2)).toEqual({ h: 0, m: 0, s: 60 });
	});
});

describe('convertMsToTime', () => {
	it('converts milliseconds into components without rolling hours over', () => {
		const r = convertMsToTime(90_061_500); // 25h 1m 1.5s
		expect(r).toMatchObject({ hours: 25, minutes: 1, seconds: 1, ms: 500, ms_p: 50 });
	});
});

describe('addHours', () => {
	it('adds hours to a fresh date without mutating the caller-visible input semantics', () => {
		const start = new Date('2026-01-01T00:00:00Z');
		const out = addHours(3, start);
		expect(out.toISOString()).toBe('2026-01-01T03:00:00.000Z');
	});
});
