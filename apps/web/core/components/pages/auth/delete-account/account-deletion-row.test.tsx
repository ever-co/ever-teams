/** @jest-environment jsdom */

/**
 * One account of an account deletion preview: the role shows in the page's language (a known Gauzy role through
 * `pages.accountDeletion.roles`), and a role a deployment named itself still shows, readable.
 */
import { render, screen } from '@testing-library/react';
import type { IAccountDeletionAccount } from '@/core/lib/auth/account-deletion';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => `t:${key}`
}));
jest.mock('@/core/components/icons', () => ({
	Alert: () => null,
	Building: () => null,
	UserRemove: () => null
}));

import { AccountDeletionRow } from './account-deletion-row';

function account(role: string | null): IAccountDeletionAccount {
	return { workspace: 'Acme', role, outcome: 'account-removed', otherMembers: 2 };
}

describe('AccountDeletionRow role label', () => {
	it.each([
		['SUPER_ADMIN', 't:pages.accountDeletion.roles.superAdmin'],
		['ADMIN', 't:pages.accountDeletion.roles.admin'],
		['employee', 't:pages.accountDeletion.roles.employee'],
		['DATA_ENTRY', 't:pages.accountDeletion.roles.dataEntry']
	])('translates the %s role', (role, label) => {
		render(<AccountDeletionRow account={account(role)} />);

		expect(screen.getByText(label)).toBeTruthy();
	});

	it('keeps a role it has no translation for, readable', () => {
		render(<AccountDeletionRow account={account('BILLING_OWNER')} />);

		expect(screen.getByText('Billing owner')).toBeTruthy();
	});

	it('shows no role badge without a role', () => {
		render(<AccountDeletionRow account={account(null)} />);

		expect(screen.queryByText(/pages\.accountDeletion\.roles/)).toBeNull();
	});
});
