import {
	deviceKindOf,
	deviceOf,
	isSessionsUnavailable,
	nextProofAfter,
	sessionsInOrder,
	USER_SESSION_REFUSAL,
	type IUserSession
} from './user-sessions';

function sessionOf(overrides: Partial<IUserSession>): IUserSession {
	return {
		id: 'session-1',
		current: false,
		app: 'WEB',
		browser: 'Chrome 131',
		os: 'Windows',
		userAgent: 'Mozilla/5.0',
		ipAddress: null,
		signedInAt: '2026-11-10T08:00:00.000Z',
		lastActiveAt: '2026-11-14T09:00:00.000Z',
		...overrides
	};
}

function errorWith(status: number, code?: string) {
	return {
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data: { code, message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

describe('sessionsInOrder', () => {
	it('lists this device first, then the others from the most recently active', () => {
		const older = sessionOf({ id: 'older', lastActiveAt: '2026-11-12T10:00:00.000Z' });
		const newer = sessionOf({ id: 'newer', lastActiveAt: '2026-11-14T10:00:00.000Z' });
		const current = sessionOf({ id: 'current', current: true, lastActiveAt: '2026-11-01T10:00:00.000Z' });

		const ids = sessionsInOrder([older, current, newer]).map((session) => session.id);

		expect(ids).toEqual(['current', 'newer', 'older']);
	});

	it('leaves the list it is given untouched', () => {
		const list = [sessionOf({ id: 'a' }), sessionOf({ id: 'b', current: true })];

		sessionsInOrder(list);

		expect(list.map((session) => session.id)).toEqual(['a', 'b']);
	});
});

describe('deviceOf', () => {
	it('names the browser and the system when the sign-in gave them', () => {
		expect(deviceOf(sessionOf({}))).toEqual({ kind: 'browser', browser: 'Chrome 131', os: 'Windows' });
	});

	it('names the browser alone when the system is unknown', () => {
		expect(deviceOf(sessionOf({ os: null }))).toEqual({ kind: 'browser', browser: 'Chrome 131', os: null });
	});

	it('names the desktop or mobile app when no browser is known', () => {
		expect(deviceOf(sessionOf({ app: 'DESKTOP', browser: null, os: 'macOS' }))).toEqual({
			kind: 'app',
			app: 'DESKTOP',
			os: 'macOS'
		});
		expect(deviceOf(sessionOf({ app: 'MOBILE', browser: null, os: null }))).toEqual({
			kind: 'app',
			app: 'MOBILE',
			os: null
		});
	});

	it('says the device is unknown when neither a browser nor an app is known', () => {
		expect(deviceOf(sessionOf({ app: 'UNKNOWN', browser: null, os: null }))).toEqual({ kind: 'unknown' });
		expect(deviceOf(sessionOf({ app: 'WEB', browser: '  ', os: 'Linux' }))).toEqual({ kind: 'unknown' });
	});
});

describe('deviceKindOf', () => {
	it('draws a phone for the mobile app and for a phone or tablet system', () => {
		expect(deviceKindOf(sessionOf({ app: 'MOBILE' }))).toBe('phone');
		expect(deviceKindOf(sessionOf({ os: 'iOS' }))).toBe('phone');
		expect(deviceKindOf(sessionOf({ os: 'Android 14' }))).toBe('phone');
	});

	it('draws a computer for the desktop app and a desktop browser', () => {
		expect(deviceKindOf(sessionOf({ app: 'DESKTOP', browser: null }))).toBe('computer');
		expect(deviceKindOf(sessionOf({ os: 'macOS' }))).toBe('computer');
	});

	it('draws a globe when the device is unknown', () => {
		expect(deviceKindOf(sessionOf({ app: 'UNKNOWN', browser: null, os: null }))).toBe('unknown');
	});
});

describe('nextProofAfter', () => {
	it('asks for the e-mailed code when a password was refused as the wrong kind of proof', () => {
		const error = errorWith(400, USER_SESSION_REFUSAL.CONFIRMATION_REQUIRED);

		expect(nextProofAfter('password', error)).toBe('code');
	});

	it('asks for the password when a code was sent to an account that has one', () => {
		const error = errorWith(400, USER_SESSION_REFUSAL.CONFIRMATION_REQUIRED);

		expect(nextProofAfter('code', error)).toBe('password');
	});

	it('keeps the same proof after a wrong password, a wrong code or any other failure', () => {
		const wrong = errorWith(400, USER_SESSION_REFUSAL.CONFIRMATION_INVALID);

		expect(nextProofAfter('password', wrong)).toBe('password');
		expect(nextProofAfter('code', wrong)).toBe('code');
		expect(nextProofAfter('password', errorWith(500))).toBe('password');
	});
});

describe('isSessionsUnavailable', () => {
	it('is true when the API has no sessions route (404)', () => {
		expect(isSessionsUnavailable(errorWith(404))).toBe(true);
	});

	it('is false for any other failure, which the section shows with a retry', () => {
		expect(isSessionsUnavailable(errorWith(500))).toBe(false);
		expect(isSessionsUnavailable(errorWith(401))).toBe(false);
		expect(isSessionsUnavailable(new Error('offline'))).toBe(false);
		expect(isSessionsUnavailable(null)).toBe(false);
	});
});
