import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { isWorkspaceSetUp } from './workspace.utils';

function workspaceWithTenant(
	tenant: ISigninEmailConfirmWorkspaces['user']['tenant'] | null
): ISigninEmailConfirmWorkspaces {
	return {
		token: 'workspace-token',
		user: {
			email: 'ada@example.test',
			imageUrl: '',
			name: 'Ada Lovelace',
			tenant: tenant as ISigninEmailConfirmWorkspaces['user']['tenant']
		},
		current_teams: []
	};
}

describe('isWorkspaceSetUp', () => {
	it('is set up when Gauzy sends its tenant, even one without a name', () => {
		expect(isWorkspaceSetUp(workspaceWithTenant({ name: 'Acme', logo: '' }))).toBe(true);
		expect(isWorkspaceSetUp(workspaceWithTenant({ name: '', logo: '' }))).toBe(true);
	});

	it('is not set up when Gauzy sends no tenant, as for an account that was never set up', () => {
		expect(isWorkspaceSetUp(workspaceWithTenant(null))).toBe(false);
	});
});
