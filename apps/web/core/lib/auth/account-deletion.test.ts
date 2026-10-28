import {
	accountDeletionConfirmUrl,
	isAccountDeletionPath,
	leavesWorkspaceWithoutAdmin,
	takeAccountDeletionToken
} from './account-deletion';

function fakeLocation(href: string) {
	const url = new URL(href, 'https://app.ever.team');
	return { pathname: url.pathname, search: url.search, hash: url.hash };
}

function fakeHistory() {
	const calls: Array<{ state: unknown; url: string }> = [];
	return {
		calls,
		replaceState: (state: unknown, _unused: string, url?: string | URL | null) => {
			calls.push({ state, url: String(url) });
		}
	};
}

describe('isAccountDeletionPath', () => {
	it.each(['/delete-account', '/delete-account/', '/delete-account/confirm', '/fr/delete-account', '/zh/delete-account/confirm'])(
		'matches %s',
		(pathname) => {
			expect(isAccountDeletionPath(pathname)).toBe(true);
		}
	);

	it.each(['/', '/auth/passcode', '/settings/personal', '/delete-accounts', '/team/delete-account', null, undefined])(
		'does not match %s',
		(pathname) => {
			expect(isAccountDeletionPath(pathname)).toBe(false);
		}
	);
});

describe('accountDeletionConfirmUrl', () => {
	it('has no locale prefix for the default locale', () => {
		expect(accountDeletionConfirmUrl('https://app.ever.team', 'en')).toBe(
			'https://app.ever.team/delete-account/confirm'
		);
	});

	it('keeps the locale prefix of another locale and drops a trailing slash of the origin', () => {
		expect(accountDeletionConfirmUrl('http://localhost:3030/', 'fr')).toBe(
			'http://localhost:3030/fr/delete-account/confirm'
		);
	});
});

describe('takeAccountDeletionToken', () => {
	it('reads the token from the fragment and removes the fragment with null history state', () => {
		const history = fakeHistory();

		expect(takeAccountDeletionToken(fakeLocation('/delete-account/confirm#token=abc_DEF-123'), history)).toBe(
			'abc_DEF-123'
		);
		// null state: Next.js syncs its router to the new address instead of writing the old one back later
		expect(history.calls).toEqual([{ state: null, url: '/delete-account/confirm' }]);
	});

	it('also accepts and removes a token in the query string, keeping the other parameters', () => {
		const history = fakeHistory();

		expect(takeAccountDeletionToken(fakeLocation('/fr/delete-account/confirm?utm=mail&token=xyz'), history)).toBe(
			'xyz'
		);
		expect(history.calls).toEqual([{ state: null, url: '/fr/delete-account/confirm?utm=mail' }]);
	});

	it('returns null, and leaves the address alone, without a token', () => {
		const history = fakeHistory();

		expect(takeAccountDeletionToken(fakeLocation('/delete-account/confirm'), history)).toBeNull();
		expect(history.calls).toEqual([]);
	});

	it('clears a fragment without a token too', () => {
		const history = fakeHistory();

		expect(takeAccountDeletionToken(fakeLocation('/delete-account/confirm#token='), history)).toBeNull();
		expect(history.calls).toEqual([{ state: null, url: '/delete-account/confirm' }]);
	});
});

describe('leavesWorkspaceWithoutAdmin', () => {
	it('is true for the only admin of a workspace with other members', () => {
		expect(
			leavesWorkspaceWithoutAdmin({
				workspace: 'Beta',
				outcome: 'account-removed',
				soleAdmin: true,
				otherMembers: 3
			})
		).toBe(true);
	});

	it('is false without other members or when other admins remain', () => {
		expect(
			leavesWorkspaceWithoutAdmin({ workspace: 'Acme', outcome: 'workspace-deleted', soleAdmin: true, otherMembers: 0 })
		).toBe(false);
		expect(
			leavesWorkspaceWithoutAdmin({ workspace: 'Beta', outcome: 'account-removed', soleAdmin: false, otherMembers: 12 })
		).toBe(false);
	});
});
