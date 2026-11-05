import { sendsSignedInVisitToApp } from './signed-in-auth-paths';

describe('sendsSignedInVisitToApp', () => {
	it.each(['/auth/passcode', '/auth/password', '/auth/signup', '/auth/workspace'])(
		'sends a signed-in visit to %s back to the app',
		(pathname) => {
			expect(sendsSignedInVisitToApp(pathname)).toBe(true);
		}
	);

	it.each(['/auth/forgot-password', '/auth/reset-password'])(
		'lets a signed-in person open %s to recover the password of another workspace',
		(pathname) => {
			expect(sendsSignedInVisitToApp(pathname)).toBe(false);
		}
	);

	it('leaves the app pages alone', () => {
		expect(sendsSignedInVisitToApp('/settings/personal')).toBe(false);
	});
});
