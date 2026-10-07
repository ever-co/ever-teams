/**
 * Unit tests for the AuthenticationStore (mobx-state-tree).
 *
 * The auth store gates every authenticated screen (`isAuthenticated`), drives the sign-in form
 * validation messages, and its `logout()` is the single place session state is torn down —
 * a field left behind there is a real security bug, so the teardown is asserted field by field.
 */
import { AuthenticationStoreModel } from './authentication-store';

const create = (snapshot: Record<string, unknown> = {}) => AuthenticationStoreModel.create(snapshot as any);

describe('AuthenticationStore', () => {
	describe('isAuthenticated', () => {
		it('is false with no token', () => expect(create().isAuthenticated).toBe(false));
		it('is false with an empty-string token', () => expect(create({ authToken: '' }).isAuthenticated).toBe(false));
		it('is true once a token is set', () => {
			const s = create();
			s.setAuthToken('jwt');
			expect(s.isAuthenticated).toBe(true);
		});
	});

	describe('validationErrors', () => {
		it('flags a blank email, team name and username', () => {
			const e = create().validationErrors;
			expect(e.authEmail).toMatch(/blank/i);
			expect(e.authTeamName).toMatch(/blank/i);
			expect(e.authUsername).toMatch(/blank/i);
		});

		it('flags a too-short email before format', () => {
			const s = create();
			s.setAuthEmail('a@b.c');
			expect(s.validationErrors.authEmail).toMatch(/6 characters/);
		});

		it('flags a malformed email of sufficient length', () => {
			const s = create();
			s.setAuthEmail('not-an-email');
			expect(s.validationErrors.authEmail).toMatch(/valid email/i);
		});

		it('clears all errors for a valid form', () => {
			const s = create();
			s.setAuthEmail('user@example.com');
			s.setAuthTeamName('Ever');
			s.setAuthUsername('Jane');
			expect(s.validationErrors).toEqual({ authEmail: '', authTeamName: '', authUsername: '' });
		});
	});

	describe('whitespace stripping on identifiers', () => {
		it.each([
			['setAuthEmail', 'authEmail', ' user @ example.com ', 'user@example.com'],
			['setAuthConfirmCode', 'authConfirmCode', '12 34 56', '123456'],
			['setAuthInviteCode', 'authInviteCode', 'AB CD', 'ABCD'],
			['setOrganizationId', 'organizationId', ' org-1 ', 'org-1'],
			['setEmployeeId', 'employeeId', ' emp 1 ', 'emp1'],
			['setTenantId', 'tenantId', 't 1', 't1']
		])('%s strips ALL spaces', (setter, field, input, expected) => {
			const s: any = create();
			s[setter](input);
			expect(s[field]).toBe(expected);
		});

		it('does NOT strip spaces from the display name or team name', () => {
			const s = create();
			s.setAuthUsername('Jane Doe');
			s.setAuthTeamName('Ever Co');
			expect(s.authUsername).toBe('Jane Doe');
			expect(s.authTeamName).toBe('Ever Co');
		});

		it('tolerates undefined input to a stripping setter', () => {
			const s = create();
			expect(() => s.setAuthEmail(undefined as any)).not.toThrow();
		});
	});

	describe('toggleTheme', () => {
		it('flips isDarkMode', () => {
			const s = create();
			expect(s.isDarkMode).toBe(false);
			s.toggleTheme();
			expect(s.isDarkMode).toBe(true);
			s.toggleTheme();
			expect(s.isDarkMode).toBe(false);
		});
	});

	describe('logout', () => {
		it('clears every piece of session state', () => {
			const s = create({
				authToken: 'jwt',
				tempAuthToken: 'tmp',
				refreshToken: 'ref',
				authEmail: 'user@example.com',
				authTeamName: 'Ever',
				authUsername: 'Jane',
				authConfirmCode: '123456',
				authInviteCode: 'ABCD',
				organizationId: 'org-1',
				tenantId: 't-1',
				employeeId: 'emp-1',
				user: { id: 'u1' }
			});
			expect(s.isAuthenticated).toBe(true);

			s.logout();

			expect(s.isAuthenticated).toBe(false);
			expect(s.authToken).toBe('');
			expect(s.tempAuthToken).toBe('');
			expect(s.refreshToken).toBe('');
			expect(s.authEmail).toBe('');
			expect(s.authTeamName).toBe('');
			expect(s.authUsername).toBe('');
			expect(s.authConfirmCode).toBe('');
			expect(s.authInviteCode).toBe('');
			expect(s.organizationId).toBe('');
			expect(s.tenantId).toBe('');
			expect(s.employeeId).toBe('');
			expect(s.user).toBeNull();
		});

		it('preserves the theme preference across logout', () => {
			const s = create({ authToken: 'jwt', isDarkMode: true });
			s.logout();
			expect(s.isDarkMode).toBe(true);
		});
	});
});
