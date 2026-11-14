/**
 * The person's own two-factor calls: bodies without tenant or organization (Gauzy's routes take neither), answers
 * holding a secret kept out of the development log, and a wrong code (401) shown as such, never a sign-out.
 */
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'organization 1'
}));

import { twoFactorService } from './two-factor.service';

describe('twoFactorService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reads the state for the active organization', async () => {
		const get = jest.spyOn(twoFactorService, 'get').mockResolvedValue({ data: { enabled: false } } as never);

		await twoFactorService.getStatus();

		expect(get).toHaveBeenCalledWith('/auth/two-factor?organizationId=organization%201');
	});

	it('keeps the secret of a new setup out of the log', async () => {
		const post = jest.spyOn(twoFactorService, 'post').mockResolvedValue({ data: {} } as never);

		await twoFactorService.enroll();

		expect(post).toHaveBeenCalledWith(
			'/auth/two-factor/enroll',
			{ issuer: expect.any(String) },
			{ secretResponse: true },
			false
		);
	});

	it.each([
		['confirm', () => twoFactorService.confirm('123456'), '/auth/two-factor/confirm', { code: '123456' }, true],
		[
			'disable',
			() => twoFactorService.disable({ code: '123456' }),
			'/auth/two-factor/disable',
			{ code: '123456' },
			false
		],
		[
			'regenerateRecoveryCodes',
			() => twoFactorService.regenerateRecoveryCodes({ recoveryCode: 'ABCDE-FGHIJ' }),
			'/auth/two-factor/recovery-codes',
			{ recoveryCode: 'ABCDE-FGHIJ' },
			true
		]
	])('%s expects the 401 of a wrong code', async (_name, call, path, body, holdsSecret) => {
		const post = jest.spyOn(twoFactorService, 'post').mockResolvedValue({ data: {} } as never);

		await call();

		const config = holdsSecret
			? { secretResponse: true, expectedUnauthorized: true }
			: { expectedUnauthorized: true };
		expect(post).toHaveBeenCalledWith(path, body, config, false);
	});

	it("resets a member's second factor by their user id", async () => {
		const remove = jest.spyOn(twoFactorService, 'delete').mockResolvedValue({ data: { reset: true } } as never);

		await expect(twoFactorService.resetMember('user-1')).resolves.toEqual({ reset: true });

		expect(remove).toHaveBeenCalledWith('/auth/two-factor/users/user-1');
	});
});
