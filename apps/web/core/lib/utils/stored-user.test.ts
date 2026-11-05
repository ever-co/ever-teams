import type { TUser } from '@/core/types/schemas';
import { shouldReplaceStoredUser } from './stored-user';

function user(id: string, updatedAt: string | undefined, roleName = 'EMPLOYEE'): TUser {
	let version: Date | undefined = undefined;
	if (updatedAt) {
		version = new Date(updatedAt);
	}
	return { id, updatedAt: version, role: { name: roleName } } as unknown as TUser;
}

describe('shouldReplaceStoredUser', () => {
	it('stores the first user the server answers', () => {
		expect(shouldReplaceStoredUser(null, user('user-ana', '2026-11-05T08:00:00Z'), null)).toBe(true);
	});

	it('takes a newer version of the same user, such as a role change', () => {
		const stored = user('user-ana', '2026-11-05T08:00:00Z', 'EMPLOYEE');
		const queried = user('user-ana', '2026-11-05T09:00:00Z', 'ADMIN');

		expect(shouldReplaceStoredUser(stored, queried, null)).toBe(true);
	});

	it('keeps a user saved locally when the query still holds an older copy', () => {
		const stored = user('user-ana', '2026-11-05T09:00:00Z');
		const queried = user('user-ana', '2026-11-05T08:00:00Z');

		expect(shouldReplaceStoredUser(stored, queried, null)).toBe(false);
	});

	it('takes another user', () => {
		const stored = user('user-ana', '2026-11-05T09:00:00Z');
		const queried = user('user-ben', '2026-11-01T08:00:00Z');

		expect(shouldReplaceStoredUser(stored, queried, null)).toBe(true);
	});

	it('changes nothing when the id and the version are the same', () => {
		const stored = user('user-ana', '2026-11-05T08:00:00Z');
		const queried = user('user-ana', '2026-11-05T08:00:00Z');

		expect(shouldReplaceStoredUser(stored, queried, null)).toBe(false);
	});

	it('keeps the stored user when the server copy has no version to compare', () => {
		expect(
			shouldReplaceStoredUser(user('user-ana', '2026-11-05T08:00:00Z'), user('user-ana', undefined), null)
		).toBe(false);
	});

	it("does not put back another user who is not the session's, such as a stale copy after a sign-in in another tab", () => {
		const stored = user('user-ben', '2026-11-05T09:00:00Z');
		const queried = user('user-ana', '2026-11-05T08:00:00Z');

		expect(shouldReplaceStoredUser(stored, queried, 'user-ben')).toBe(false);
	});

	it("takes another user who is the session's", () => {
		const stored = user('user-ana', '2026-11-05T09:00:00Z');
		const queried = user('user-ben', '2026-11-01T08:00:00Z');

		expect(shouldReplaceStoredUser(stored, queried, 'user-ben')).toBe(true);
	});
});
